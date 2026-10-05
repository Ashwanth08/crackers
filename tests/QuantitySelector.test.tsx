import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuantitySelector from "../components/QuantitySelector";

/**
 * Component tests for QuantitySelector.
 *
 * Verifies rendering of the value and both controls, the increment callback,
 * decrement enabling above the minimum, decrement disabling at the minimum,
 * and the >=44x44px touch-target sizing on both buttons.
 *
 * **Validates: Requirements 3.6, 3.7, 3.8, 3.5**
 */
describe("QuantitySelector", () => {
  it("renders the quantity value and both control buttons", () => {
    render(
      <QuantitySelector
        quantity={5}
        minimumQuantity={1}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
      />
    );

    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByLabelText("Decrease quantity")).toBeTruthy();
    expect(screen.getByLabelText("Increase quantity")).toBeTruthy();
  });

  it("calls onIncrement once when the increase button is clicked (Req 3.6)", () => {
    const onIncrement = vi.fn();

    render(
      <QuantitySelector
        quantity={2}
        minimumQuantity={1}
        onDecrement={vi.fn()}
        onIncrement={onIncrement}
      />
    );

    fireEvent.click(screen.getByLabelText("Increase quantity"));

    expect(onIncrement).toHaveBeenCalledTimes(1);
  });

  it("enables the decrease button above the minimum and calls onDecrement (Req 3.7)", () => {
    const onDecrement = vi.fn();

    render(
      <QuantitySelector
        quantity={3}
        minimumQuantity={1}
        onDecrement={onDecrement}
        onIncrement={vi.fn()}
      />
    );

    const decrease = screen.getByLabelText(
      "Decrease quantity"
    ) as HTMLButtonElement;

    expect(decrease.disabled).toBe(false);

    fireEvent.click(decrease);

    expect(onDecrement).toHaveBeenCalledTimes(1);
  });

  it("disables the decrease button at the minimum and does not call onDecrement (Req 3.8)", () => {
    const onDecrement = vi.fn();

    render(
      <QuantitySelector
        quantity={1}
        minimumQuantity={1}
        onDecrement={onDecrement}
        onIncrement={vi.fn()}
      />
    );

    const decrease = screen.getByLabelText(
      "Decrease quantity"
    ) as HTMLButtonElement;

    expect(decrease.disabled).toBe(true);

    fireEvent.click(decrease);

    expect(onDecrement).not.toHaveBeenCalled();
  });

  it("gives both buttons a >=44x44px touch target (Req 3.5)", () => {
    render(
      <QuantitySelector
        quantity={2}
        minimumQuantity={1}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
      />
    );

    const decrease = screen.getByLabelText("Decrease quantity");
    const increase = screen.getByLabelText("Increase quantity");

    for (const button of [decrease, increase]) {
      expect(button.className).toContain("min-h-[44px]");
      expect(button.className).toContain("min-w-[44px]");
    }
  });
});
