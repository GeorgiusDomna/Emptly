import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConnectRoom from "@/pages/ConnectRoom/ConnectRoom";

const { navigateMock, toastErrorMock } = vi.hoisted(() => ({
	navigateMock: vi.fn(),
	toastErrorMock: vi.fn()
}));

vi.mock("sonner", () => ({
	toast: {
		error: toastErrorMock
	}
}));

vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
	return {
		...actual,
		useNavigate: () => navigateMock
	};
});

describe("ConnectRoom", () => {
	beforeEach(() => {
		navigateMock.mockReset();
		toastErrorMock.mockReset();
	});

	it("shows validation error for invalid room target", () => {
		render(
			<MemoryRouter>
				<ConnectRoom />
			</MemoryRouter>
		);

		fireEvent.change(screen.getByPlaceholderText("https://.../room/<roomId>/ или roomId"), {
			target: { value: "bad" }
		});
		fireEvent.click(screen.getByRole("button", { name: "Войти в комнату" }));

		expect(navigateMock).not.toHaveBeenCalled();
		expect(toastErrorMock).toHaveBeenCalled();
	});

	it("navigates to room when invite link is valid", () => {
		render(
			<MemoryRouter>
				<ConnectRoom />
			</MemoryRouter>
		);

		const roomId = "roomABCD1234";
		const roomKey = "x".repeat(43);
		fireEvent.change(screen.getByPlaceholderText("https://.../room/<roomId>/ или roomId"), {
			target: { value: `https://chat.local/room/${roomId}/#k=${roomKey}` }
		});
		fireEvent.click(screen.getByRole("button", { name: "Войти в комнату" }));

		expect(navigateMock).toHaveBeenCalledWith({
			pathname: `/room/${roomId}/`,
			hash: `k=${roomKey}`
		});
	});
});
