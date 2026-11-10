'use client';
export default function ErrorPage({ reset }) {
  return <p role="alert">Không tải được món. <button onClick={reset}>Thử lại</button></p>;
}
