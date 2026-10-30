import ErrorPage from "@/components/errors/ErrorPage";

export default function ServerError() {
  return (
    <ErrorPage
      code="500"
      title="Something went wrong"
      message="That didn't work on our side. Try again in a moment, or go back home."
      ways={["home", "retry", "report"]}
      hint="If this keeps happening, tell your workspace admin or report it."
    />
  );
}
