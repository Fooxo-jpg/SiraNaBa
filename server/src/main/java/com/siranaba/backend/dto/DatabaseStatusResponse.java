package com.siranaba.backend.dto;

import java.util.List;

/**
 * Live MongoDB details for the admin Configuration page. Deliberately contains
 * no connection string, username or password - only host names and the database
 * name. Numeric fields are null when the server doesn't report them (for
 * example `uptimeSeconds` on some Atlas shared tiers, which restrict serverStatus).
 */
public record DatabaseStatusResponse(
        boolean connected,
        /** Connected | Offline */
        String status,
        String database,
        /** Host names from the connection string, without credentials. */
        List<String> hosts,
        /** true for mongodb+srv:// (Atlas-style) connection strings. */
        boolean srv,
        String version,
        Long uptimeSeconds,
        /** Round-trip time of a ping, in milliseconds. */
        Long latencyMs,
        Long dataSizeBytes,
        Long storageSizeBytes,
        Long indexSizeBytes,
        List<CollectionInfo> collections,
        /** Why the database couldn't be reached; null when connected. */
        String error,
        /** ISO-8601 instant of this check. */
        String checkedAt
) {
    public record CollectionInfo(String name, long documents) {
    }
}
