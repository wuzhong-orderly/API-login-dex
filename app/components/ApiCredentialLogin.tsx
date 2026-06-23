import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BaseOrderlyKeyPair } from "@orderly.network/core";
import { useAccount } from "@orderly.network/hooks";
import { AccountStatusEnum } from "@orderly.network/types";
import { getRuntimeConfig } from "@/utils/runtime-config";

type StatusLevel = "idle" | "checking" | "ok" | "error";

type ApiKeyStatus = {
  level: StatusLevel;
  message: string;
};

type AccountDetails = {
  address: string;
  brokerId: string;
};

type ApiKeyDetails = {
  expiration?: number;
  keyStatus?: string;
};

type StoredApiCredential = {
  accountId: string;
  apiKey: string;
  secretKey: string;
};

const API_CREDENTIAL_STORAGE_KEY = "sp_api_credential_login";

const readStoredApiCredential = (): StoredApiCredential | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const rawValue = localStorage.getItem(API_CREDENTIAL_STORAGE_KEY);
    if (!rawValue) {
      return undefined;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredApiCredential>;
    if (!parsed.accountId || !parsed.apiKey || !parsed.secretKey) {
      return undefined;
    }

    return {
      accountId: parsed.accountId,
      apiKey: parsed.apiKey,
      secretKey: parsed.secretKey,
    };
  } catch {
    return undefined;
  }
};

const writeStoredApiCredential = (credential: StoredApiCredential) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      API_CREDENTIAL_STORAGE_KEY,
      JSON.stringify(credential),
    );
  } catch {
    // Ignore storage failures so API login can still proceed.
  }
};

const removeStoredApiCredential = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(API_CREDENTIAL_STORAGE_KEY);
  } catch {
    // Ignore storage failures so disconnect can still proceed.
  }
};

const stripEd25519Prefix = (value: string) => {
  return value.trim().replace(/^ed25519:/i, "");
};

const normalizeOrderlyKey = (value: string) => {
  return `ed25519:${stripEd25519Prefix(value)}`;
};

const normalizeOrderlySecret = (value: string) => {
  return stripEd25519Prefix(value);
};

const getApiLoginAddress = (accountId: string) => {
  return `api-login:${accountId.trim()}`;
};

const getFallbackOrderlyApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return "https://api.orderly.org";
  }

  return localStorage.getItem("orderly_network_id") === "testnet"
    ? "https://testnet-api.orderly.org"
    : "https://api.orderly.org";
};

const formatAddress = (address?: string) => {
  if (!address) {
    return undefined;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatLongValue = (value?: string) => {
  if (!value) {
    return undefined;
  }

  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-6)}`;
};

const formatExpirationDate = (expiration?: number) => {
  if (!expiration) {
    return "Expiry unavailable";
  }

  const timestamp =
    expiration < 1_000_000_000_000 ? expiration * 1000 : expiration;
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Expiry unavailable";
  }

  return `Exp ${date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
};

const fetchAccountDetails = async (
  accountId: string,
  apiBaseUrl?: string,
): Promise<AccountDetails | undefined> => {
  try {
    const url = new URL(
      "/v1/public/account",
      apiBaseUrl || getFallbackOrderlyApiBaseUrl(),
    );
    url.searchParams.set("account_id", accountId);

    const response = await fetch(url.toString());
    const payload = await response.json();

    if (!response.ok || !payload?.success || !payload?.data) {
      return undefined;
    }

    return {
      address: payload.data.address,
      brokerId: payload.data.broker_id,
    };
  } catch {
    return undefined;
  }
};

const fetchApiKeyDetails = async (
  accountId: string,
  orderlyKey: string,
  apiBaseUrl?: string,
): Promise<ApiKeyDetails | undefined> => {
  try {
    const url = new URL(
      "/v1/get_orderly_key",
      apiBaseUrl || getFallbackOrderlyApiBaseUrl(),
    );
    url.searchParams.set("account_id", accountId);
    url.searchParams.set("orderly_key", orderlyKey);

    const response = await fetch(url.toString());
    const payload = await response.json();

    if (!response.ok || !payload?.success || !payload?.data) {
      return undefined;
    }

    return {
      expiration: payload.data.expiration,
      keyStatus: payload.data.key_status,
    };
  } catch {
    return undefined;
  }
};

export function ApiCredentialLogin() {
  const { account, state } = useAccount();
  const autoLoginAttemptedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [currentApiKey, setCurrentApiKey] = useState("");
  const [apiKeyDetails, setApiKeyDetails] = useState<ApiKeyDetails>();
  const [accountDetails, setAccountDetails] = useState<AccountDetails>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [status, setStatus] = useState<ApiKeyStatus>({
    level: "idle",
    message: "Waiting for API key check.",
  });

  const isApiLoggedIn = useMemo(() => {
    return state.status === AccountStatusEnum.EnableTradingWithoutConnected;
  }, [state.status]);

  const brokerLabel =
    accountDetails?.brokerId ||
    getRuntimeConfig("VITE_ORDERLY_BROKER_ID") ||
    getRuntimeConfig("VITE_ORDERLY_BROKER_NAME") ||
    "Broker";

  const expiryLabel = formatExpirationDate(apiKeyDetails?.expiration);
  const addressLabel = formatAddress(accountDetails?.address);
  const brokerNameLabel =
    getRuntimeConfig("VITE_ORDERLY_BROKER_NAME") || "Unavailable";
  const accountIdLabel = state.accountId || accountId || "Unavailable";
  const walletAddressLabel = accountDetails?.address || "Unavailable";
  const apiKeyLabel = currentApiKey || apiKey || "Unavailable";
  const navStatusDetails = [brokerLabel, addressLabel, expiryLabel]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    if (!isApiLoggedIn) {
      setCurrentApiKey("");
      setApiKeyDetails(undefined);
      setAccountDetails(undefined);
      return;
    }

    let mounted = true;

    const syncCurrentApiKey = async () => {
      const orderlyKey = account.keyStore.getOrderlyKey(state.address);
      const publicKey = await orderlyKey?.getPublicKey();

      if (mounted && publicKey) {
        setCurrentApiKey(publicKey);
      }

      if (!state.accountId) {
        return;
      }

      const [details, keyDetails] = await Promise.all([
        fetchAccountDetails(state.accountId, account.apiBaseUrl),
        publicKey
          ? fetchApiKeyDetails(state.accountId, publicKey, account.apiBaseUrl)
          : Promise.resolve(undefined),
      ]);

      if (mounted && details) {
        setAccountDetails(details);
      }

      if (mounted && keyDetails) {
        setApiKeyDetails(keyDetails);
      }
    };

    syncCurrentApiKey();

    return () => {
      mounted = false;
    };
  }, [
    account.apiBaseUrl,
    account.keyStore,
    isApiLoggedIn,
    state.accountId,
    state.address,
  ]);

  const resetStatus = () => {
    setStatus({
      level: "idle",
      message: "Waiting for API key check.",
    });
  };

  const loginWithCredential = useCallback(
    async (
      credential: StoredApiCredential,
      options: { persist: boolean; silent?: boolean } = { persist: true },
    ) => {
      const trimmedAccountId = credential.accountId.trim();
      const normalizedSecretKey = normalizeOrderlySecret(credential.secretKey);
      const normalizedApiKey = normalizeOrderlyKey(credential.apiKey);

      if (
        !trimmedAccountId ||
        !credential.apiKey.trim() ||
        !normalizedSecretKey
      ) {
        throw new Error("Please fill Account ID, API Key, and Secret Key.");
      }

      setStatus({
        level: "checking",
        message: options.silent
          ? "Restoring saved API session..."
          : "Validating API key and secret key pair...",
      });

      const orderlyKeyPair = new BaseOrderlyKeyPair(normalizedSecretKey);
      const derivedApiKey = await orderlyKeyPair.getPublicKey();

      if (derivedApiKey !== normalizedApiKey) {
        setStatus({
          level: "error",
          message: "API key mismatch: secret key does not derive this API key.",
        });
        throw new Error("API Key does not match the provided Secret Key.");
      }

      setStatus({
        level: "checking",
        message: "Checking API key status on this Account ID...",
      });

      const result = await account.checkOrderlyKey(
        getApiLoginAddress(trimmedAccountId),
        orderlyKeyPair,
        trimmedAccountId,
      );

      if (!result) {
        setStatus({
          level: "error",
          message: "Inactive API key: not active for this Account ID.",
        });
        throw new Error("This API Key is not active for the Account ID.");
      }

      setStatus({
        level: "checking",
        message: "Checking account broker and wallet address...",
      });

      const details = await fetchAccountDetails(
        trimmedAccountId,
        account.apiBaseUrl,
      );
      const keyDetails = await fetchApiKeyDetails(
        trimmedAccountId,
        normalizedApiKey,
        account.apiBaseUrl,
      );

      setStatus({
        level: "ok",
        message: "Active API key verified and ready for trading.",
      });

      if (options.persist) {
        writeStoredApiCredential({
          accountId: trimmedAccountId,
          apiKey: normalizedApiKey,
          secretKey: normalizedSecretKey,
        });
      }

      setAccountId(trimmedAccountId);
      setApiKey(normalizedApiKey);
      setCurrentApiKey(normalizedApiKey);
      setApiKeyDetails(keyDetails);
      setAccountDetails(details);
      setSecretKey("");
      setOpen(false);
    },
    [account],
  );

  useEffect(() => {
    if (autoLoginAttemptedRef.current || isApiLoggedIn) {
      return;
    }

    const storedCredential = readStoredApiCredential();
    if (!storedCredential) {
      return;
    }

    autoLoginAttemptedRef.current = true;
    setLoading(true);
    setError("");

    loginWithCredential(storedCredential, { persist: true, silent: true })
      .catch(() => {
        removeStoredApiCredential();
        setStatus({
          level: "error",
          message: "Saved API session expired or is no longer valid.",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isApiLoggedIn, loginWithCredential]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginWithCredential(
        {
          accountId,
          apiKey,
          secretKey,
        },
        { persist: true },
      );
    } catch (reason) {
      setStatus({
        level: "error",
        message:
          "API key check failed. Please review the fields and try again.",
      });
      setError(reason instanceof Error ? reason.message : "API login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setError("");
    setDisconnecting(true);

    try {
      await account.disconnect();
      removeStoredApiCredential();
      setAccountId("");
      setApiKey("");
      setSecretKey("");
      setCurrentApiKey("");
      setApiKeyDetails(undefined);
      setAccountDetails(undefined);
      resetStatus();
      setOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "API disconnect failed.",
      );
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <>
      <button
        className={`api-credential-login-button ${
          isApiLoggedIn ? "api-credential-login-button-active" : ""
        }`}
        type="button"
        onClick={() => {
          setError("");
          resetStatus();
          setOpen(true);
        }}
      >
        {isApiLoggedIn ? (
          <>
            <span className="api-credential-login-dot" />
            <span className="api-credential-login-button-main">API Key</span>
            <span className="api-credential-login-button-detail">
              {navStatusDetails}
            </span>
          </>
        ) : (
          "API Login"
        )}
      </button>

      {open && (
        <div className="api-credential-login-overlay" role="presentation">
          <div
            aria-modal="true"
            className="api-credential-login-dialog"
            role="dialog"
          >
            <div className="api-credential-login-header">
              <h2>{isApiLoggedIn ? "API Session" : "API Login"}</h2>
              <button
                aria-label="Close"
                className="api-credential-login-close"
                type="button"
                onClick={() => {
                  resetStatus();
                  setOpen(false);
                }}
              >
                x
              </button>
            </div>

            {isApiLoggedIn ? (
              <div className="api-credential-login-session">
                <dl className="api-credential-login-details">
                  <div>
                    <dt>Broker ID</dt>
                    <dd>{brokerLabel}</dd>
                  </div>

                  <div>
                    <dt>Wallet Address</dt>
                    <dd title={walletAddressLabel}>
                      {formatLongValue(walletAddressLabel)}
                    </dd>
                  </div>

                  <div>
                    <dt>Account ID</dt>
                    <dd title={accountIdLabel}>
                      {formatLongValue(accountIdLabel)}
                    </dd>
                  </div>

                  <div>
                    <dt>API Key</dt>
                    <dd title={apiKeyLabel}>{formatLongValue(apiKeyLabel)}</dd>
                  </div>

                  <div>
                    <dt>Expiry Date</dt>
                    <dd>{expiryLabel}</dd>
                  </div>
                </dl>

                {error && <p className="api-credential-login-error">{error}</p>}

                <div className="api-credential-login-actions">
                  <button
                    className="api-credential-login-disconnect"
                    disabled={disconnecting}
                    type="button"
                    onClick={handleDisconnect}
                  >
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="api-credential-login-form"
                onSubmit={handleSubmit}
              >
                <label>
                  <span>Account ID</span>
                  <input
                    autoComplete="off"
                    placeholder="0x..."
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                  />
                </label>

                <label>
                  <span>API Key</span>
                  <input
                    autoComplete="off"
                    placeholder="ed25519:..."
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                  />
                </label>

                <label>
                  <span>Secret Key</span>
                  <input
                    autoComplete="off"
                    placeholder="Base58 secret key or ed25519:..."
                    type="password"
                    value={secretKey}
                    onChange={(event) => setSecretKey(event.target.value)}
                  />
                </label>

                <p
                  className={`api-credential-login-status-message api-credential-login-status-${status.level}`}
                  aria-live="polite"
                >
                  {status.message}
                </p>

                {error && <p className="api-credential-login-error">{error}</p>}

                <div className="api-credential-login-actions">
                  <button
                    className="api-credential-login-submit"
                    disabled={loading || disconnecting}
                    type="submit"
                  >
                    {loading ? "Checking..." : "Login"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
