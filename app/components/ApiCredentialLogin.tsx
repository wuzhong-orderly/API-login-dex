import { FormEvent, useMemo, useState } from "react";
import { BaseOrderlyKeyPair } from "@orderly.network/core";
import { useAccount } from "@orderly.network/hooks";
import { AccountStatusEnum } from "@orderly.network/types";

const normalizeOrderlyKey = (value: string) => {
  const key = value.trim();
  return key.startsWith("ed25519:") ? key : `ed25519:${key}`;
};

const getApiLoginAddress = (accountId: string) => {
  return `api-login:${accountId.trim()}`;
};

export function ApiCredentialLogin() {
  const { account, state } = useAccount();
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isApiLoggedIn = useMemo(() => {
    return state.status === AccountStatusEnum.EnableTradingWithoutConnected;
  }, [state.status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const trimmedAccountId = accountId.trim();
      const trimmedSecretKey = secretKey.trim();
      const normalizedApiKey = normalizeOrderlyKey(apiKey);

      if (!trimmedAccountId || !apiKey.trim() || !trimmedSecretKey) {
        throw new Error("Please fill Account ID, API Key, and Secret Key.");
      }

      const orderlyKeyPair = new BaseOrderlyKeyPair(trimmedSecretKey);
      const derivedApiKey = await orderlyKeyPair.getPublicKey();

      if (derivedApiKey !== normalizedApiKey) {
        throw new Error("API Key does not match the provided Secret Key.");
      }

      const result = await account.checkOrderlyKey(
        getApiLoginAddress(trimmedAccountId),
        orderlyKeyPair,
        trimmedAccountId
      );

      if (!result) {
        throw new Error("This API Key is not active for the Account ID.");
      }

      setSecretKey("");
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "API login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="api-credential-login-button"
        type="button"
        onClick={() => setOpen(true)}
      >
        {isApiLoggedIn ? "API Logged In" : "API Login"}
      </button>

      {open && (
        <div className="api-credential-login-overlay" role="presentation">
          <div
            aria-modal="true"
            className="api-credential-login-dialog"
            role="dialog"
          >
            <div className="api-credential-login-header">
              <h2>API Login</h2>
              <button
                aria-label="Close"
                className="api-credential-login-close"
                type="button"
                onClick={() => setOpen(false)}
              >
                x
              </button>
            </div>

            <form className="api-credential-login-form" onSubmit={handleSubmit}>
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
                  placeholder="Base58 secret key"
                  type="password"
                  value={secretKey}
                  onChange={(event) => setSecretKey(event.target.value)}
                />
              </label>

              {error && <p className="api-credential-login-error">{error}</p>}

              <button
                className="api-credential-login-submit"
                disabled={loading}
                type="submit"
              >
                {loading ? "Checking..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
