import type { NextPage } from "next";
import type { ReactElement } from "react";

// A page can name the layout that frames it (pages/_app.tsx wraps it): `Page.layout = workspace`.

export type LayoutProps = (props: { children: ReactElement }) => ReactElement;

export type pageWithLayout<P = {}, IP = P> = NextPage<P, IP> & { layout?: LayoutProps };

export type LayoutComponent = NextPage & { Layout: LayoutProps };
