package com.datashifter.notification.hub.channels;

import com.datashifter.notification.hub.dto.NotificationContext;
import com.datashifter.notification.hub.models.ChannelType;
import com.datashifter.notification.hub.models.NotificationChannelConfig;

/**
 * Common interface for all NotifyHub notification channels.
 * Implementations handle channel-specific delivery logic, authentication, and payload formats.
 */
public interface NotificationChannel {

    /**
     * The type of channel this implementation handles (EMAIL, SLACK, TEAMS, CLIQ, WEBHOOK).
     */
    ChannelType getChannelType();

    /**
     * Send notification through this channel.
     *
     * @param channelConfig The channel configuration entity (contains credentials, webhooks, etc.)
     * @param context       The resolved notification context (subject, message, metadata, priority, etc.)
     * @throws Exception    Throws exception on failure so caller can retry or log appropriately
     */
    void send(NotificationChannelConfig channelConfig, NotificationContext context) throws Exception;

    /**
     * Validate channel configuration map/JSON before saving.
     */
    void validateConfig(NotificationChannelConfig channelConfig) throws IllegalArgumentException;
}
