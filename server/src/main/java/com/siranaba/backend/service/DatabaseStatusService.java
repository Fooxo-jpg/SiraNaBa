package com.siranaba.backend.service;

import com.mongodb.ConnectionString;
import com.siranaba.backend.dto.DatabaseStatusResponse;
import com.siranaba.backend.dto.DatabaseStatusResponse.CollectionInfo;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

/**
 * Reads live health and size information from the MongoDB this app is connected
 * to, for the admin Configuration page. Only the ping is required; the other
 * commands (version, sizes, uptime) are best-effort because managed clusters
 * restrict some of them, and a missing value shouldn't hide a healthy database.
 */
@Service
public class DatabaseStatusService {

    private static final Logger log = LoggerFactory.getLogger(DatabaseStatusService.class);

    private final MongoTemplate mongoTemplate;
    private final String uri;

    public DatabaseStatusService(MongoTemplate mongoTemplate,
                                 @Value("${spring.data.mongodb.uri}") String uri) {
        this.mongoTemplate = mongoTemplate;
        this.uri = uri;
    }

    public DatabaseStatusResponse check() {
        String database = mongoTemplate.getDb().getName();
        List<String> hosts = List.of();
        boolean srv = false;
        try {
            // Only hosts are read from the URI; the credentials in it never leave this method.
            ConnectionString cs = new ConnectionString(uri);
            hosts = List.copyOf(cs.getHosts());
            srv = cs.isSrvProtocol();
        } catch (RuntimeException ex) {
            log.debug("Could not parse the MongoDB connection string for display.");
        }
        String checkedAt = Instant.now().toString();

        long started = System.nanoTime();
        try {
            mongoTemplate.executeCommand("{ ping: 1 }");
        } catch (RuntimeException ex) {
            log.warn("MongoDB health check failed: {}", ex.toString());
            return new DatabaseStatusResponse(false, "Offline", database, hosts, srv, null, null, null,
                    null, null, null, List.of(),
                    "Could not reach MongoDB (" + ex.getClass().getSimpleName()
                            + "). Check MONGODB_URI and that the server is running.",
                    checkedAt);
        }
        long latencyMs = (System.nanoTime() - started) / 1_000_000;

        Document build = tryCommand("{ buildInfo: 1 }");
        Document stats = tryCommand("{ dbStats: 1 }");
        Document server = tryCommand("{ serverStatus: 1 }");

        List<CollectionInfo> collections = List.of();
        try {
            collections = mongoTemplate.getCollectionNames().stream()
                    .filter(name -> !name.startsWith("system."))
                    .sorted()
                    .map(name -> new CollectionInfo(name, mongoTemplate.estimatedCount(name)))
                    .toList();
        } catch (RuntimeException ex) {
            log.debug("Could not list collections: {}", ex.toString());
        }

        return new DatabaseStatusResponse(true, "Connected", database, hosts, srv,
                build == null ? null : build.getString("version"),
                number(server, "uptime"), latencyMs,
                number(stats, "dataSize"), number(stats, "storageSize"), number(stats, "indexSize"),
                collections, null, checkedAt);
    }

    private Document tryCommand(String json) {
        try {
            return mongoTemplate.executeCommand(json);
        } catch (RuntimeException ex) {
            log.debug("MongoDB command {} not available: {}", json, ex.toString());
            return null;
        }
    }

    private static Long number(Document doc, String key) {
        if (doc == null) {
            return null;
        }
        return doc.get(key) instanceof Number n ? n.longValue() : null;
    }
}
