import InterpreterView from "@/components/InterpreterView";

export const metadata = {
  title: "실시간 동시통역 (KR/JP)",
  description: "한국어와 일본어 간의 간단한 동시통역 앱입니다.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function Home() {
  return (
    <main className="h-full w-full">
      <InterpreterView />
    </main>
  );
}
