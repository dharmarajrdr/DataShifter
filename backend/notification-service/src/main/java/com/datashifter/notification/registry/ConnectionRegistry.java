package com.datashifter.notification.registry;

import com.datashifter.notification.config.SseConfig;
import com.datashifter.notification.models.SseSubscription;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Thread-safe registry for all active SSE connections.
 *
 * <h3>Data structures:</h3>
 * <ul>
 *   <li>{@code channelMap}: channel → Set&lt;subscriptionId&gt; — for fast event routing</li>
 *   <li>{@code subscriptionMap}: subscriptionId → SseSubscription — for lookup and cleanup</li>
 *   <li>{@code userConnectionCount}: userId → count — for per-user connection limits</li>
 * </ul>
 *
 * <h3>Thread safety:</h3>
 * All maps are ConcurrentHashMap. Individual operations (register, unregister, getSubscribers)
 * are atomic at the map level. The registry handles concurrent Kafka consumers and SSE
 * connection/disconnection events safely.
 *
 * <h3>Cleanup:</h3>
 * When an SSE connection completes, times out, or errors, the emitter's completion/timeout/error
 * callbacks call {@link #unregister(String)}. This removes the subscription from all channels
 * and decrements the user's connection count.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ConnectionRegistry {

    private final SseConfig sseConfig;

    /** channel → set of subscription IDs subscribed to that channel */
    private final ConcurrentHashMap<String, Set<String>> channelMap = new ConcurrentHashMap<>();

    /** subscriptionId → full subscription object */
    private final ConcurrentHashMap<String, SseSubscription> subscriptionMap = new ConcurrentHashMap<>();

    /** userId → number of active SSE connections */
    private final ConcurrentHashMap<String, Integer> userConnectionCount = new ConcurrentHashMap<>();

    /**
     * Register a new SSE subscription.
     *
     * @param subscription the subscription to register
     * @throws IllegalStateException if the user has exceeded max connections
     */
    public void register(SseSubscription subscription) {
        // Check per-user connection limit
        int currentCount = userConnectionCount.getOrDefault(subscription.getUserId(), 0);
        if (currentCount >= sseConfig.getMaxConnectionsPerUser()) {
            throw new IllegalStateException(
                    "Connection limit exceeded. Max " + sseConfig.getMaxConnectionsPerUser() +
                    " concurrent SSE connections per user.");
        }

        // Store the subscription
        subscriptionMap.put(subscription.getId(), subscription);
        userConnectionCount.merge(subscription.getUserId(), 1, Integer::sum);

        // Register each channel
        for (String channel : subscription.getChannels()) {
            channelMap.computeIfAbsent(channel, k -> ConcurrentHashMap.newKeySet()).add(subscription.getId());
        }

        log.info("SSE registered: id={}, user={}, channels={}, totalActive={}",
                subscription.getId(), subscription.getUserId(),
                subscription.getChannels(), subscriptionMap.size());
    }

    /**
     * Unregister a subscription (called on disconnect, timeout, or error).
     *
     * @param subscriptionId the subscription to remove
     */
    public void unregister(String subscriptionId) {
        SseSubscription sub = subscriptionMap.remove(subscriptionId);
        if (sub == null) return;

        // Remove from all channel sets
        for (String channel : sub.getChannels()) {
            Set<String> subscribers = channelMap.get(channel);
            if (subscribers != null) {
                subscribers.remove(subscriptionId);
                // Clean up empty channel sets to prevent memory leak
                if (subscribers.isEmpty()) {
                    channelMap.remove(channel);
                }
            }
        }

        // Decrement user connection count
        userConnectionCount.computeIfPresent(sub.getUserId(), (k, v) -> v <= 1 ? null : v - 1);

        log.debug("SSE unregistered: id={}, user={}, totalActive={}",
                subscriptionId, sub.getUserId(), subscriptionMap.size());
    }

    /**
     * Get all subscriptions listening to a specific channel.
     *
     * @param channel the channel to look up (e.g., "pipeline:p-001")
     * @return list of active subscriptions for that channel (never null)
     */
    public List<SseSubscription> getSubscribers(String channel) {
        Set<String> subIds = channelMap.get(channel);
        if (subIds == null || subIds.isEmpty()) return List.of();

        return subIds.stream()
                .map(subscriptionMap::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * Get all active subscriptions (for heartbeat broadcasting).
     *
     * @return unmodifiable collection of all active subscriptions
     */
    public Collection<SseSubscription> getAllSubscriptions() {
        return Collections.unmodifiableCollection(subscriptionMap.values());
    }

    /**
     * Get the number of active connections for a user.
     *
     * @param userId the user to check
     * @return number of active SSE connections
     */
    public int getUserConnectionCount(String userId) {
        return userConnectionCount.getOrDefault(userId, 0);
    }

    /**
     * Get total number of active SSE connections across all users.
     */
    public int getTotalConnectionCount() {
        return subscriptionMap.size();
    }

    /**
     * Get the number of active channels with at least one subscriber.
     */
    public int getActiveChannelCount() {
        return channelMap.size();
    }
}
