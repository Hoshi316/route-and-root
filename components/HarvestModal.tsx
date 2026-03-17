// components/HarvestModal.tsx
import { AppleVariety, APPLE_NAMES } from "@/lib/apple"; // ★ 共通定義を使う

type Props = {
  apples: { variety: AppleVariety; note: string; comment?: string }[];
  onClose: () => void;
};

export default function HarvestModal({ apples, onClose }: Props) {
  // 収穫されたリンゴの総数
  const totalCount = apples.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      <div className="bg-white p-8 rounded-[40px] shadow-2xl text-center max-w-md w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        
        <div className="mb-2 text-4xl">🧺</div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">大収穫だ！</h2>
        <p className="text-slate-500 text-sm mb-6">
          {totalCount}個のリンゴを貯蔵庫へ運びました。
        </p>
        
        {/* ★ リンゴたちのグリッド表示 */}
        <div className="grid grid-cols-3 gap-4 mb-8 bg-orange-50/50 p-6 rounded-[30px] border-2 border-orange-100">
          {apples.map((apple, index) => (
            <div key={index} className="flex flex-col items-center animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
              <img 
                src={`/images/apple-${apple.variety}.svg`} 
                alt={apple.variety} 
                className="w-16 h-16 object-contain drop-shadow-md hover:scale-110 transition-transform"
              />
              <span className="text-[8px] font-black text-orange-400 mt-1 uppercase">
                {APPLE_NAMES[apple.variety]}
              </span>
            </div>
          ))}
        </div>

        {/* まとめメッセージ */}
        <div className="bg-slate-50 p-4 rounded-2xl mb-8 text-left">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">今回の収穫メモ</p>
          <ul className="space-y-1">
            {apples.slice(0, 3).map((apple, i) => (
              <li key={i} className="text-xs text-slate-600 font-bold truncate">
                • {apple.note || "（メモなし）"}
              </li>
            ))}
            {totalCount > 3 && <li className="text-[10px] text-slate-400 font-bold ml-3">...他 {totalCount - 3}件</li>}
          </ul>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg hover:bg-orange-600 transition-all active:scale-95"
        >
          農園を整える
        </button>
      </div>
    </div>
  );
}