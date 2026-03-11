import { NextResponse } from "next/server";

/**
 * 간단한 번역 시뮬레이션 API입니다.
 * 실제 서비스 시에는 Google Cloud Translation 또는 DeepL API 등으로 교체해야 합니다.
 */
export async function POST(req: Request) {
    try {
        const { text, sourceLang, targetLang } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "텍스트가 없습니다." }, { status: 400 });
        }

        // MyMemory API를 이용한 실제 번역 시도
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
        );
        const data = await response.json();

        let translatedText = "";
        if (data.responseData && data.responseData.translatedText) {
            translatedText = data.responseData.translatedText;
        } else {
            // API 실패 시 폴백 (모의 번역)
            translatedText = targetLang === "ja" ? `${text} (翻訳なし)` : `${text} (번역 실패)`;
        }

        return NextResponse.json({ translatedText });
    } catch (error) {
        console.error("번역 에러:", error);
        return NextResponse.json({ error: "번역 중 오류가 발생했습니다." }, { status: 500 });
    }
}
