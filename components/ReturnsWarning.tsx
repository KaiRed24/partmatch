export default function ReturnsWarning({ category, returnable, restockingFee }: { category: string; returnable: boolean; restockingFee?: boolean }) {
  if (returnable && !restockingFee) return null;
  const text = !returnable
    ? category === "thermostatic_cartridge"
      ? "Thermostatic cartridges can't be returned once opened, so please double-check your measurements before ordering."
      : category === "seat_hinge"
        ? "Seat hinges can't be returned once the pack is opened, so please double-check the fixing type and hole spacing."
        : "This part can't be returned once opened, so please double-check your measurements."
    : "A 20% restocking charge applies if this part is returned unused.";
  return (
    <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200" role="note">
      <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 fill-amber-500" aria-hidden>
        <path d="M10 2 1 18h18L10 2Zm0 5 .1 0c.5 0 .9.4.9.9v4.2a1 1 0 0 1-2 0V7.9c0-.5.4-.9 1-.9Zm0 9.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z" />
      </svg>
      <p>{text}</p>
    </div>
  );
}
