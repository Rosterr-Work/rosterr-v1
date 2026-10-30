import ErrorPage from "@/components/errors/ErrorPage";

export default function Forbidden() {
  return <ErrorPage code="403" title="Access denied" message="You don't have permission to open this page. If you think that's a mistake, ask an administrator of the workspace." ways={["home", "back", "report"]} />;
}
