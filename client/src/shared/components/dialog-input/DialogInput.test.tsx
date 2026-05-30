import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DialogInput } from "@/shared/components/dialog-input/DialogInput";

function DialogInputHarness(props: { disabled?: boolean; onSubmit?: () => void }) {
	const [value, setValue] = useState("");

	return (
		<DialogInput
			value={value}
			onChange={setValue}
			onSubmit={props.onSubmit ?? (() => undefined)}
			disabled={props.disabled}
		/>
	);
}

describe("DialogInput", () => {
	it("submits message by Enter and clears text", async () => {
		const user = userEvent.setup();
		const submitMock = vi.fn();

		render(<DialogInputHarness onSubmit={submitMock} />);
		const input = screen.getByPlaceholderText("Введите сообщение");

		await user.type(input, "Привет, собеседник{enter}");

		expect(submitMock).toHaveBeenCalledTimes(1);
		expect(screen.getByPlaceholderText("Введите сообщение")).toHaveValue("");
	});

	it("does not submit when disabled", async () => {
		const user = userEvent.setup();
		const submitMock = vi.fn();

		render(<DialogInputHarness onSubmit={submitMock} disabled />);
		const input = screen.getByPlaceholderText("Введите сообщение");

		await user.type(input, "Тест");
		await user.keyboard("{enter}");

		expect(submitMock).not.toHaveBeenCalled();
	});
});
