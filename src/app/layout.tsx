export const metadata = { title: "almi-billing-router", description: "AlmiWorld consolidated Stripe webhook router" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
