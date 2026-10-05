import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CheckoutForm from "../components/CheckoutForm";
import type { CustomerDetails } from "../lib/types";

/**
 * Component tests for CheckoutForm's submit-button disabling behaviour.
 *
 * The parent owns the processing state and passes it in via `submitting`
 * (Req 8.8): while submitting the primary button is disabled and shows a
 * "Submitting..." label; the parent re-enables it (within the <=1s UI timing
 * requirement) by flipping `submitting` back to false on complete/fail. These
 * tests assert the prop-driven enable/disable behaviour that satisfies that
 * contract, and that a disabled button swallows clicks.
 *
 * **Validates: Requirements 8.8, 20.4**
 */
describe("CheckoutForm submit-button disabling", () => {
  it("disables the submit button and shows 'Submitting...' while submitting (Req 8.8)", () => {
    render(<CheckoutForm submitting={true} onSubmit={vi.fn()} />);

    const button = screen.getByRole("button", {
      name: "Submitting...",
    }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe("Submitting...");
  });

  it("enables the submit button and shows 'SUBMIT ORDER' when not submitting (Req 8.8)", () => {
    render(<CheckoutForm submitting={false} onSubmit={vi.fn()} />);

    const button = screen.getByRole("button", {
      name: "SUBMIT ORDER",
    }) as HTMLButtonElement;

    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe("SUBMIT ORDER");
  });

  it("re-enables the button when the parent flips submitting back to false (Req 20.4)", () => {
    // Models the parent toggling the flag on completion/failure (the <=1s UI
    // timing requirement is satisfied by this prop flip).
    const { rerender } = render(
      <CheckoutForm submitting={true} onSubmit={vi.fn()} />
    );

    let button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe("Submitting...");

    rerender(<CheckoutForm submitting={false} onSubmit={vi.fn()} />);

    button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe("SUBMIT ORDER");
  });

  it("submits trimmed CustomerDetails when enabled, but a disabled button swallows the click", () => {
    const onSubmit = vi.fn();

    const { rerender } = render(
      <CheckoutForm submitting={false} onSubmit={onSubmit} />
    );

    // Fill the required fields with values that need trimming.
    fireEvent.change(screen.getByLabelText(/Full Name/), {
      target: { value: "  Priya Sharma  " },
    });
    fireEvent.change(screen.getByLabelText(/Mobile Number/), {
      target: { value: " 98765 43210 " },
    });
    fireEvent.change(screen.getByLabelText(/Delivery Address/), {
      target: { value: "  12 Market Road, Sivakasi  " },
    });

    // submitting=false -> clicking the enabled button triggers onSubmit.
    fireEvent.click(screen.getByRole("button", { name: "SUBMIT ORDER" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0] as CustomerDetails;
    expect(submitted.fullName).toBe("Priya Sharma");
    expect(submitted.mobile).toBe("98765 43210");
    expect(submitted.address).toBe("12 Market Road, Sivakasi");

    // Now the parent flips to submitting=true -> the button is disabled and a
    // click does nothing (onSubmit is not called again).
    onSubmit.mockClear();
    rerender(<CheckoutForm submitting={true} onSubmit={onSubmit} />);

    const disabled = screen.getByRole("button", {
      name: "Submitting...",
    }) as HTMLButtonElement;
    expect(disabled.disabled).toBe(true);

    fireEvent.click(disabled);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
