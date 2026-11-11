import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Menu from "./page.jsx";

vi.mock("next/image", () => ({
  default: ({ alt }) => <span role="img" aria-label={alt} />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const products = [
  {
    id: 1,
    name: "Cà phê sữa",
    description: "Cà phê pha cùng sữa đặc.",
    price: 29000,
    stock: 12,
    imageUrl: "/products/ca-phe-sua.jpg",
  },
];

function successfulResponse(data) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(data),
  };
}

function deferredRequest() {
  let resolve;

  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe("Menu", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows loading then renders products returned by the API", async () => {
    const request = deferredRequest();
    globalThis.fetch.mockReturnValueOnce(request.promise);

    render(<Menu />);

    expect(screen.getByRole("status")).toHaveTextContent("Đang tải thực đơn…");

    await act(async () => {
      request.resolve(successfulResponse(products));
    });

    expect(await screen.findByText("Cà phê sữa")).toBeInTheDocument();
    expect(screen.getByText("29.000đ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem chi tiết" })).toHaveAttribute(
      "href",
      "/products/1",
    );
  });

  it("retries after an API error and renders products", async () => {
    globalThis.fetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(successfulResponse(products));

    render(<Menu />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không tải được menu.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(await screen.findByText("Cà phê sữa")).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("shows the empty state when the API returns no products", async () => {
    globalThis.fetch.mockResolvedValueOnce(successfulResponse([]));

    render(<Menu />);

    expect(
      await screen.findByText("Thực đơn chưa có món."),
    ).toBeInTheDocument();
  });
});
