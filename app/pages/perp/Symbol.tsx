import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAccount } from "@orderly.network/hooks";
import { API, AccountStatusEnum } from "@orderly.network/types";
import { TradingPage } from "@orderly.network/trading";
import { updateSymbol } from "@/utils/storage";
import { formatSymbol, generatePageTitle } from "@/utils/utils";
import { useOrderlyConfig } from "@/utils/config";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PerpSymbol() {
  const params = useParams();
  const [symbol, setSymbol] = useState(params.symbol!);
  const config = useOrderlyConfig();
  const { state } = useAccount();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthenticated =
    state.status === AccountStatusEnum.SignedIn ||
    state.status === AccountStatusEnum.EnableTrading ||
    state.status === AccountStatusEnum.EnableTradingWithoutConnected;

  useEffect(() => {
    updateSymbol(symbol);
  }, [symbol]);

  const onSymbolChange = useCallback(
    (data: API.Symbol) => {
      const symbol = data.symbol;
      setSymbol(symbol);

      const searchParamsString = searchParams.toString();
      const queryString = searchParamsString ? `?${searchParamsString}` : "";

      navigate(`/perp/${symbol}${queryString}`);
    },
    [navigate, searchParams]
  );

  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle(formatSymbol(params.symbol!));

  return (
    <div
      className={`h-full ${
        isAuthenticated
          ? "sp-account-authenticated"
          : "sp-account-not-authenticated"
      }`}
    >
      {renderSEOTags(pageMeta, pageTitle)}
      <TradingPage
        symbol={symbol}
        onSymbolChange={onSymbolChange}
        tradingViewConfig={config.tradingPage.tradingViewConfig}
        sharePnLConfig={config.tradingPage.sharePnLConfig}
      />
      <div className="md:hidden pb-2 pt-8 text-center">
        <span className="oui-text-2xs oui-text-base-contrast-54">
          Charts powered by{" "}
          <a
            href="https://tradingview.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            TradingView
          </a>
        </span>
      </div>
    </div>
  );
}
