export default function TitleBar() {
  return (
    <div
      className="flex items-center justify-between h-8 select-none"
      style={
        {
          WebkitAppRegion: 'drag', // draggable region
        } as React.CSSProperties
      }
    >
      <div className="px-3 text-sm font-medium tracking-wide">Electron + shadcn/ui Template</div>
    </div>
  );
}
