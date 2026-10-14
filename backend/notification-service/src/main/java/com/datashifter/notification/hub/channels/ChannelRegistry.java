package com.datashifter.notification.hub.channels;

import com.datashifter.notification.hub.models.ChannelType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Registry holding all active channel implementations (Email, Slack, Teams, Cliq, Webhook).
 */
@Component
public class ChannelRegistry {

    private final Map<ChannelType, NotificationChannel> channels = new EnumMap<>(ChannelType.class);

    public ChannelRegistry(List<NotificationChannel> channelList) {
        for (NotificationChannel channel : channelList) {
            channels.put(channel.getChannelType(), channel);
        }
    }

    public Optional<NotificationChannel> getChannel(ChannelType type) {
        return Optional.ofNullable(channels.get(type));
    }

    public boolean hasChannel(ChannelType type) {
        return channels.containsKey(type);
    }
}
