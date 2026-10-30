type AuthHeadingProps = {
  bold: string;
  rest: string;
};

export function AuthHeading({ bold, rest }: AuthHeadingProps) {
  return (
    <h2 className="mb-1 text-center text-[clamp(20px,1.8vw,24px)] leading-[1.3] font-normal tracking-[-0.02em] text-balance text-foreground short:text-xl short:whitespace-nowrap">
      <strong className="font-[760]">{bold}</strong> {rest}
    </h2>
  );
}
