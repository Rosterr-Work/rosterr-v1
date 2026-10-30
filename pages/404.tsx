import ErrorPage from "@/components/errors/ErrorPage";

export default function NotFound() {
  return (
    <ErrorPage
      code="404"
      title="You're in the wrong place"
      message="That page doesn't exist, or it has moved. Head home, or go back to where you were."
      ways={["home", "back"]}
    />
  );
}
