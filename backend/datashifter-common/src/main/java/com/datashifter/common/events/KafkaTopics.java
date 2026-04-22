package com.datashifter.common.events;

public final class KafkaTopics {
    private KafkaTopics() {}

    public static final String PIPELINE_JOBS     = "pipeline.jobs";
    public static final String PIPELINE_COMMANDS  = "pipeline.commands";
    public static final String PIPELINE_PROGRESS  = "pipeline.progress";
    public static final String PIPELINE_ERRORS    = "pipeline.errors";
    public static final String PIPELINE_STATUS    = "pipeline.status";
}
