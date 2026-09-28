package com.siranaba.backend.service;

import com.siranaba.backend.dto.AddPaymentMethodRequest;
import com.siranaba.backend.dto.PayRequest;
import com.siranaba.backend.dto.PaymentReceipt;
import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.exception.ResourceNotFoundException;
import com.siranaba.backend.model.Billing;
import com.siranaba.backend.model.Billing.PaymentMethod;
import com.siranaba.backend.model.Tenant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class BillingService {

    private static final ZoneId MANILA = ZoneId.of("Asia/Manila");

    private final BillingLedgerService ledger;
    private final TenantContext tenantContext;

    public BillingService(BillingLedgerService ledger, TenantContext tenantContext) {
        this.ledger = ledger;
        this.tenantContext = tenantContext;
    }

    public Billing getBilling() {
        Tenant tenant = tenantContext.currentTenant();
        return load(tenant.getId());
    }

    // ---- Payment methods -------------------------------------------------

    public Billing addPaymentMethod(AddPaymentMethodRequest req) {
        Tenant tenant = tenantContext.currentTenant();
        Billing billing = load(tenant.getId());

        String type = req.type() == null ? "" : req.type().trim().toUpperCase(Locale.ROOT);
        PaymentMethod method = new PaymentMethod();
        method.setId("PM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT));
        method.setType(type);

        switch (type) {
            case "CARD" -> {
                String digits = digits(req.cardNumber());
                if (digits.length() < 13 || digits.length() > 19) {
                    throw bad("Enter a valid card number.");
                }
                method.setProvider(cardBrand(digits));
                method.setLast4(digits.substring(digits.length() - 4));
                method.setExpiry(validExpiry(req.expiry()));
                method.setAccountName(required(req.accountName(), "Enter the name on the card."));
            }
            case "EWALLET" -> {
                method.setProvider(oneOf(req.provider(), PaymentProviders.EWALLETS, "Choose GCash or Maya."));
                String mobile = digits(req.mobileNumber());
                // 09171234567, 9171234567 or 639171234567
                if (!(mobile.matches("09\\d{9}") || mobile.matches("9\\d{9}") || mobile.matches("639\\d{9}"))) {
                    throw bad("Enter a valid mobile number, e.g. 0917 123 4567.");
                }
                method.setLast4(mobile.substring(mobile.length() - 4));
                method.setAccountName(clean(req.accountName()));
            }
            case "BANK" -> {
                method.setProvider(oneOf(req.provider(), PaymentProviders.BANKS, "Choose a supported bank."));
                String account = digits(req.accountNumber());
                if (account.length() < 8 || account.length() > 16) {
                    throw bad("Enter a valid account number (8 to 16 digits).");
                }
                method.setLast4(account.substring(account.length() - 4));
                method.setAccountName(required(req.accountName(), "Enter the account holder's name."));
            }
            default -> throw bad("Choose a payment method type: card, e-wallet or online banking.");
        }

        boolean duplicate = billing.getPaymentMethods().stream().anyMatch(m ->
                m.getType().equals(method.getType()) && m.getProvider().equals(method.getProvider())
                        && m.getLast4().equals(method.getLast4()));
        if (duplicate) {
            throw new ApiException(HttpStatus.CONFLICT, "This payment method is already saved.");
        }

        List<PaymentMethod> methods = new ArrayList<>(billing.getPaymentMethods());
        boolean makePrimary = methods.isEmpty() || Boolean.TRUE.equals(req.setAsPrimary());
        if (makePrimary) {
            methods.forEach(m -> m.setPrimary(false));
        }
        method.setPrimary(makePrimary);
        methods.add(method);
        billing.setPaymentMethods(methods);
        return ledger.saveMethods(billing);
    }

    public Billing setPrimary(String methodId) {
        Tenant tenant = tenantContext.currentTenant();
        Billing billing = load(tenant.getId());
        findMethod(billing, methodId); // 404 if it isn't theirs
        billing.getPaymentMethods().forEach(m -> m.setPrimary(m.getId().equals(methodId)));
        return ledger.saveMethods(billing);
    }

    public Billing removePaymentMethod(String methodId) {
        Tenant tenant = tenantContext.currentTenant();
        Billing billing = load(tenant.getId());
        PaymentMethod removed = findMethod(billing, methodId);
        List<PaymentMethod> methods = new ArrayList<>(billing.getPaymentMethods());
        methods.remove(removed);
        if (removed.isPrimary() && !methods.isEmpty()) {
            methods.get(0).setPrimary(true); // never leave the tenant with methods but no primary
        }
        billing.setPaymentMethods(methods);
        return ledger.saveMethods(billing);
    }

    // ---- Pay the balance --------------------------------------------------

    public PaymentReceipt pay(PayRequest req) {
        String tenantId = tenantContext.currentTenant().getId();
        return ledger.mutate(tenantId, billing -> {
            var prior = billing.getTransactions().stream().filter(t -> req.idempotencyKey() != null && req.idempotencyKey().equals(t.getIdempotencyKey())).findFirst().orElse(null);
            if (prior != null) return PaymentReceipt.from(BillingAccounting.pay(billing, req, prior.getPaymentMode(), true));
        String mode;
        if (req.paymentMethodId() != null && !req.paymentMethodId().isBlank()) {
            mode = describe(findMethod(billing, req.paymentMethodId()));
        } else {
            String type = req.type() == null ? "" : req.type().trim().toUpperCase(Locale.ROOT);
            mode = switch (type) {
                case "EWALLET" -> oneOf(req.provider(), PaymentProviders.EWALLETS, "Choose GCash or Maya.");
                case "BANK" -> oneOf(req.provider(), PaymentProviders.BANKS, "Choose a supported bank.") + " Online Banking";
                case "CARD" -> "Credit/Debit Card";
                default -> throw bad("Choose how you want to pay.");
            };
        }


            // No provider integration exists: all tenant checkout payments are explicitly simulated.
            return PaymentReceipt.from(BillingAccounting.pay(billing, req, mode, true));
        });
    }

    private Billing load(String tenantId) { return ledger.get(tenantId); }

    private static PaymentMethod findMethod(Billing billing, String id) {
        return billing.getPaymentMethods().stream()
                .filter(m -> m.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Payment method not found."));
    }

    private static String describe(PaymentMethod m) {
        String masked = " (\u2022\u2022\u2022\u2022 " + m.getLast4() + ")";
        return switch (m.getType()) {
            case "BANK" -> m.getProvider() + " Online Banking" + masked;
            default -> m.getProvider() + masked;
        };
    }

    private static String cardBrand(String d) {
        if (d.startsWith("4")) return "Visa";
        if (d.matches("^(5[1-5]|2[2-7]).*")) return "Mastercard";
        if (d.matches("^3[47].*")) return "American Express";
        if (d.startsWith("35")) return "JCB";
        return "Card";
    }

    private static String validExpiry(String raw) {
        String v = raw == null ? "" : raw.trim();
        if (!v.matches("(0[1-9]|1[0-2])/\\d{2}")) {
            throw bad("Enter the expiry date as MM/YY.");
        }
        YearMonth expiry = YearMonth.of(2000 + Integer.parseInt(v.substring(3)), Integer.parseInt(v.substring(0, 2)));
        if (expiry.isBefore(YearMonth.now(MANILA))) {
            throw bad("This card has expired.");
        }
        return v;
    }

    private static String oneOf(String value, List<String> allowed, String message) {
        return allowed.stream()
                .filter(a -> a.equalsIgnoreCase(value == null ? "" : value.trim()))
                .findFirst()
                .orElseThrow(() -> bad(message));
    }

    private static String required(String value, String message) {
        String v = clean(value);
        if (v == null) throw bad(message);
        return v;
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim().replaceAll("\\s+", " ");
    }

    private static String digits(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }

    private static ApiException bad(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }
}
