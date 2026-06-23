import { useEffect } from "react";

const CONNECT_WALLET_LABELS = new Set(
  [
    "connect wallet",
    "connect wallet now",
    "conectar billetera",
    "conectar carteira",
    "conectar carteira agora",
    "connetti portafoglio",
    "connetti portafoglio ora",
    "connecter le portefeuille",
    "connecter le portefeuille maintenant",
    "wallet verbinden",
    "wallet jetzt verbinden",
    "portemonnee nu verbinden",
    "hubungkan wallet",
    "hubungkan dompet sekarang",
    "cüzdanı bağla",
    "şimdi cüzdanı bağla",
    "cüzdanı bağla",
    "подключить кошелек",
    "подключить кошелек сейчас",
    "połącz portfel",
    "połącz portfel teraz",
    "підключити гаманець",
    "підключити гаманець зараз",
    "kết nối ví",
    "kết nối ví ngay bây giờ",
    "연결 지갑",
    "지갑 연결",
    "지금 지갑 연결",
    "ウォレットを接続",
    "今すぐウォレットを接続",
    "连接钱包",
    "立即连接钱包",
    "連接錢包",
    "立即連接錢包",
  ].map((label) => normalize(label))
);

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function shouldHideConnectWalletButton(element: HTMLElement) {
  const text = normalize(element.textContent || "");
  const ariaLabel = normalize(element.getAttribute("aria-label") || "");
  const title = normalize(element.getAttribute("title") || "");
  const tooltip = normalize(element.getAttribute("data-tooltip") || "");

  return [text, ariaLabel, title, tooltip].some((value) =>
    CONNECT_WALLET_LABELS.has(value)
  );
}

function hideConnectWalletButtons(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("button, [role='button']").forEach((element) => {
    if (shouldHideConnectWalletButton(element)) {
      element.setAttribute("data-hide-connect-wallet-button", "true");
    }
  });
}

export function HideConnectWalletButtons() {
  useEffect(() => {
    hideConnectWalletButtons();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.target instanceof HTMLElement) {
          hideConnectWalletButtons(mutation.target);
        } else if (mutation.target.parentElement) {
          hideConnectWalletButtons(mutation.target.parentElement);
        }

        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (
              node.matches("button, [role='button']") &&
              shouldHideConnectWalletButton(node)
            ) {
              node.setAttribute("data-hide-connect-wallet-button", "true");
            }

            hideConnectWalletButtons(node);
          }
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "title", "data-tooltip"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
