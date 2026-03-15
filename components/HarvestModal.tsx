// components/HarvestModal.tsx
type Props = {
  variety: 'sun' | 'moon' | 'midnight' | 'forest' | 'rare';
  onClose: () => void;
};

export default function HarvestModal({ variety, onClose }: Props) {
  const names = {
    sun: "サン・ルビー",
    moon: "ムーン・シルバー",
    forest: "フォレスト・ジェイド",
    midnight: "ミッドナイト",
    rare: "ゴールデン・ピピン"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl text-center max-w-sm w-[90%] animate-in zoom-in-95 duration-300">
        <h2 className="text-2xl font-black text-slate-800 mb-2">収穫おめでとう！</h2>
        <p className="text-slate-500 text-sm mb-6">新しいリンゴが貯蔵庫に追加されました。</p>
        
        {/* 自作リンゴの表示 */}
        <div className="relative mb-8 flex justify-center">
          <div className="absolute inset-0 bg-orange-100 rounded-full blur-3xl opacity-50 animate-pulse" />
          <img 
            src={`/images/apple-${variety}.svg`} 
            alt={variety} 
            className="w-48 h-48 object-contain relative z-10 animate-bounce-slow"
          />
        </div>

        <div className="inline-block px-6 py-2 bg-slate-100 rounded-full mb-8">
          <span className="text-lg font-black text-slate-700">{names[variety]}</span>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg hover:bg-orange-600 transition-colors"
        >
          農園に戻る
        </button>
      </div>
    </div>
  );
}