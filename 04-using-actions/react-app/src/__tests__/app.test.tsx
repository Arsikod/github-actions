import { render, screen } from "@testing-library/react";

import App from "../App";

describe("App test example", () => {
  test("should render properly", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        level: 1,
      })
    ).toHaveTextContent(/welcome/i);
  });
});
