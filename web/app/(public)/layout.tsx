import WhatsappFloating from "@/components/WhatsappFloating";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <WhatsappFloating />
    </>
  );
}
