import { Outlet, useLocation } from "react-router-dom";
import {
  PortfolioLayoutWidget,
  usePortfolioLayoutScript,
} from "@orderly.network/portfolio";
import { useOrderlyConfig } from "@/utils/config";
import { useNav } from "@/hooks/useNav";

export default function PortfolioLayout() {
  const location = useLocation();
  const pathname = location.pathname;

  const { onRouteChange } = useNav();
  const config = useOrderlyConfig();
  const { items } = usePortfolioLayoutScript({ current: pathname });
  const filteredItems = items.filter((item) => item.href !== "/portfolio/apiKey");

  return (
    <PortfolioLayoutWidget
      items={filteredItems}
      footerProps={config.scaffold.footerProps}
      mainNavProps={{
        ...config.scaffold.mainNavProps,
        initialMenu: "/portfolio",
      }}
      routerAdapter={{
        onRouteChange,
      }}
      leftSideProps={{
        current: pathname,
      }}
      bottomNavProps={config.scaffold.bottomNavProps}
    >
      <div className="oui-portfolio-page">
        <Outlet />
      </div>
    </PortfolioLayoutWidget>
  );
}
