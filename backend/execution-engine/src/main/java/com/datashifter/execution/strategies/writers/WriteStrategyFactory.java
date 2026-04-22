package com.datashifter.execution.strategies.writers;

import com.datashifter.common.enums.WriteMode;
import com.datashifter.common.exceptions.DatashifterException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Factory that auto-discovers all WriteStrategy implementations via Spring DI.
 *
 * To add a new write mode:
 * 1. Create a class implementing WriteStrategy
 * 2. Annotate with @Component
 * 3. Return the correct WriteMode from getMode()
 * 4. Done — factory picks it up automatically.
 */
@Component
public class WriteStrategyFactory {

    private final Map<WriteMode, WriteStrategy> strategyMap;

    public WriteStrategyFactory(List<WriteStrategy> strategies) {
        this.strategyMap = strategies.stream()
                .collect(Collectors.toMap(
                        WriteStrategy::getMode,
                        Function.identity()
                ));
    }

    public WriteStrategy getStrategy(WriteMode mode) {
        WriteStrategy strategy = strategyMap.get(mode);
        if (strategy == null) {
            throw new DatashifterException("No write strategy registered for mode: " + mode);
        }
        return strategy;
    }

    public WriteStrategy getStrategy(String modeName) {
        try {
            return getStrategy(WriteMode.valueOf(modeName));
        } catch (IllegalArgumentException e) {
            throw new DatashifterException("Unknown write mode: " + modeName);
        }
    }
}