package com.siranaba.backend.service;

import java.util.concurrent.locks.ReentrantReadWriteLock;

/** Coordinates this server's requests and scheduled writers during database cleanup. */
public final class DatabaseMaintenanceGate {
    private DatabaseMaintenanceGate() {}
    public static final ReentrantReadWriteLock LOCK = new ReentrantReadWriteLock(true);
    public static void runBackground(Runnable work) {
        LOCK.readLock().lock();
        try { work.run(); } finally { LOCK.readLock().unlock(); }
    }
}
