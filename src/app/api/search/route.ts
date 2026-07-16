import { NextRequest, NextResponse } from 'next/server';
import { searchRakutenItems } from '@/lib/rakuten';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawKeyword = searchParams.get('keyword') || '';
  const sort = searchParams.get('sort') || '+itemPrice';
  const brand = searchParams.get('brand') || '';

  try {
    const items = await searchRakutenItems({ keyword: rawKeyword, brand, sort });
    
    if (items.length === 0 && rawKeyword === '') {
      return NextResponse.json({ error: '検索キーワードは2文字以上で指定してください。' }, { status: 400 });
    }

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('APIルートでのエラー:', error);
    return NextResponse.json({ error: error.message || '通信エラーが発生しました。' }, { status: 500 });
  }
}