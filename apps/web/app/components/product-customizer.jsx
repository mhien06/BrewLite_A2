'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatVndPrice } from '../catalog.mjs';
import { Icon } from './icons';
import { isStaffSession } from './role-access';
import { useStore } from './store';

export default function ProductCustomizer({ product, sizes, toppings }) {
  const [sizeId, setSizeId] = useState(sizes[0]?.id ?? null);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart, session, hydrated } = useStore();
  const staffSession = hydrated && isStaffSession(session);
  const chosenSize = sizes.find((size) => size.id === sizeId);
  const total = useMemo(() => (Number(product.price) + Number(chosenSize?.surcharge || 0) + toppings.filter((t) => selectedToppings.includes(t.id)).reduce((sum, t) => sum + Number(t.surcharge), 0)) * quantity, [product.price, chosenSize, selectedToppings, toppings, quantity]);

  function toggleTopping(id) {
    setAdded(false);
    setSelectedToppings((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function add() {
    if (!hydrated || staffSession || !chosenSize || product.stock < 1) return;
    const chosenToppings = toppings.filter((t) => selectedToppings.includes(t.id));
    addToCart({ productId: product.id, name: product.name, imageUrl: product.imageUrl, basePrice: Number(product.price), unitPrice: total / quantity, quantity, sizeOptionId: chosenSize.id, sizeName: chosenSize.name, sizeSurcharge: Number(chosenSize.surcharge), toppingOptionIds: chosenToppings.map((t) => t.id), toppings: chosenToppings.map((t) => ({ id: t.id, name: t.name, surcharge: Number(t.surcharge) })) });
    setAdded(true);
  }

  return <div className="customizer">
    <div className="detail-stock"><span className={product.stock > 0 ? 'stock-dot' : 'stock-dot out'}/>{product.stock > 0 ? `Còn ${product.stock} ly hôm nay` : 'Tạm hết hàng'}</div>
    <div className="option-group"><div className="option-heading"><h2>01. Chọn kích thước</h2><span>Bắt buộc</span></div><div className="option-list">{sizes.map((option) => <button type="button" key={option.id} className={sizeId === option.id ? 'option-choice chosen' : 'option-choice'} onClick={() => { setSizeId(option.id); setAdded(false); }} aria-pressed={sizeId === option.id}><span className="choice-tick">{sizeId === option.id && <Icon name="check" size={13}/>}</span><span className="choice-name">{option.name}</span><small>{Number(option.surcharge) === 0 ? 'Miễn phí' : `+${formatVndPrice(Number(option.surcharge))}`}</small></button>)}</div></div>
    {toppings.length > 0 && <div className="option-group"><div className="option-heading"><h2>02. Thêm topping</h2><span>Tùy chọn</span></div><div className="topping-list">{toppings.map((option) => <label className={selectedToppings.includes(option.id) ? 'topping-choice chosen' : 'topping-choice'} key={option.id}><input type="checkbox" checked={selectedToppings.includes(option.id)} onChange={() => toggleTopping(option.id)}/><span>{option.name}</span><small>+{formatVndPrice(Number(option.surcharge))}</small></label>)}</div></div>}
    <div className="purchase-row"><div><span className="small-label">SỐ LƯỢNG</span><div className="stepper"><button type="button" aria-label="Giảm số lượng" onClick={() => { setQuantity(Math.max(1, quantity - 1)); setAdded(false); }} disabled={quantity <= 1}><Icon name="minus" size={16}/></button><b>{quantity}</b><button type="button" aria-label="Tăng số lượng" onClick={() => { setQuantity(Math.min(Math.max(1, product.stock), quantity + 1)); setAdded(false); }} disabled={quantity >= product.stock}><Icon name="plus" size={16}/></button></div></div><div className="purchase-total"><span className="small-label">TỔNG CỘNG</span><strong>{formatVndPrice(total)}</strong></div></div>
    <button type="button" className="button button-primary add-cart" disabled={!hydrated || staffSession || !chosenSize || product.stock < 1} onClick={add}><Icon name={added ? 'check' : 'bag'} size={20}/>{added ? 'Đã thêm vào giỏ' : 'Thêm vào giỏ hàng'}<Icon name="arrow" size={20}/></button>
    {staffSession && <p className="detail-note" role="status">Tài khoản Nhân viên hoặc Quản lý chỉ có thể xem thực đơn.</p>}
    {added && !staffSession && <div className="added-message" role="status">Đã thêm món vào giỏ. <Link href="/cart">Xem giỏ hàng →</Link></div>}
    <p className="detail-note"><Icon name="shield" size={16}/> Giá cuối cùng được kiểm tra lại khi tạo đơn.</p>
  </div>;
}
