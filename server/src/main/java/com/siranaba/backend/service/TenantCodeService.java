package com.siranaba.backend.service;

import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.repository.TenantRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Hands out the registry IDs ("T-0001", "T-0002", ...) that the admin portal
 * shows next to each tenant. They live on the Tenant document so both sides of
 * the app agree on them, instead of the admin UI inventing its own numbering.
 */
@Service
public class TenantCodeService {

    private static final Pattern CODE = Pattern.compile("^T-(\\d+)$");

    private final TenantRepository tenantRepository;

    public TenantCodeService(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    /** Next free code: one above the highest one in use. */
    public synchronized String nextCode() {
        return format(highestNumber(tenantRepository.findAll()) + 1);
    }

    /**
     * Gives a code to every tenant that doesn't have one yet (e.g. the seeded
     * demo tenant, or tenants registered before codes existed), oldest first.
     * Does nothing - and writes nothing - once everyone has one.
     */
    public synchronized void assignMissingCodes() {
        List<Tenant> all = tenantRepository.findAll();
        List<Tenant> missing = all.stream()
                .filter(t -> t.getTenantCode() == null || t.getTenantCode().isBlank())
                .sorted(Comparator.comparing(Tenant::getId)) // ObjectIds sort by creation time
                .toList();
        if (missing.isEmpty()) {
            return;
        }
        int next = highestNumber(all);
        for (Tenant t : missing) {
            t.setTenantCode(format(++next));
        }
        tenantRepository.saveAll(missing);
    }

    /** "T-0012" -> 12; anything unparsable -> 0. */
    public static int number(String code) {
        if (code == null) {
            return 0;
        }
        Matcher m = CODE.matcher(code);
        return m.matches() ? Integer.parseInt(m.group(1)) : 0;
    }

    private static int highestNumber(List<Tenant> tenants) {
        int max = 0;
        for (Tenant t : tenants) {
            max = Math.max(max, number(t.getTenantCode()));
        }
        return max;
    }

    private static String format(int n) {
        return String.format("T-%04d", n);
    }
}
