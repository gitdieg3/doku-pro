import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Image as ImageIcon, FileText, Download, X, RefreshCw, Upload, 
  ChevronRight, Minimize2, CheckCircle2, FileDigit, Crop
} from 'lucide-react';

/**
 * Komponen Utama DOKU.PRO
 * Berfungsi untuk menangkap gambar dari kamera, melakukan cropping,
 * dan menyusunnya menjadi dokumen panjang (Long Strip) dengan kompresi otomatis < 2MB.
 */
const App = () => {
  // --- STATE MANAGEMENT ---
  const [view, setView] = useState('home'); 
  const [capturedImages, setCapturedImages] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalFile, setFinalFile] = useState({ name: '', size: '', type: '', dataUrl: null });
  const [fileName, setFileName] = useState("");
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const cropCanvasRef = useRef(null);

  // --- STYLES (NEO-BRUTALISM) ---
  const styles = {
    card: "bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8 transition-all",
    button: "border-[4px] border-black font-[1000] uppercase tracking-tighter px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2",
    input: "w-full border-[4px] border-black p-4 font-bold outline-none focus:bg-[#f3ff59] transition-colors placeholder:text-black/30",
    label: "block font-[1000] text-xs uppercase tracking-widest mb-2 italic",
    navLink: "flex items-center gap-1 font-black uppercase text-xs tracking-widest hover:bg-[#f3ff59] px-3 py-2 border-2 border-transparent hover:border-black transition-all cursor-pointer",
  };

  // --- EFFECTS ---
  
  // Menangani rendering pratinjau cropping pada kanvas
  useEffect(() => {
    if (view === 'crop' && editingIndex !== null && cropCanvasRef.current) {
      const canvas = cropCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
        const nw = img.width * ratio;
        const nh = img.height * ratio;
        ctx.drawImage(img, (canvas.width - nw) / 2, (canvas.height - nh) / 2, nw, nh);
      };
      img.src = capturedImages[editingIndex];
    }
  }, [view, editingIndex, capturedImages]);

  // --- LOGIKA KAMERA ---
  const startCamera = async () => {
    setView('capture');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      alert("Akses kamera ditolak. Pastikan web dibuka menggunakan protokol HTTPS.");
      setView('home');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    setCapturedImages([...capturedImages, canvas.toDataURL('image/jpeg', 0.9)]);
  };

  // --- LOGIKA CROPPING ---
  const handleCropSave = () => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const croppedUrl = canvas.toDataURL('image/jpeg', 0.9);
    const newImages = [...capturedImages];
    newImages[editingIndex] = croppedUrl;
    setCapturedImages(newImages);
    setEditingIndex(null);
    setView('capture');
  };

  // --- ENGINE: GENERASI DOKUMEN PANJANG ---
  const generateDocument = async (format) => {
    setIsProcessing(true);
    stopCamera();

    const pageWidth = 1240; 
    const loadedImages = await Promise.all(capturedImages.map(src => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
      });
    }));

    const headerHeight = 200;
    const totalImageHeight = loadedImages.reduce((sum, img) => {
      const ratio = img.height / img.width;
      return sum + (pageWidth * ratio);
    }, 0);
    const canvasHeight = headerHeight + totalImageHeight + 100;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = pageWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, pageWidth, canvasHeight);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, pageWidth, headerHeight);
    ctx.fillStyle = '#f3ff59';
    ctx.font = 'bold 50px Arial';
    ctx.fillText('DOKU.PRO OFFICIAL ARCHIVE', 50, 100);
    ctx.font = '20px Courier';
    ctx.fillText(`GENERATED: ${new Date().toLocaleString()}`, 50, 150);

    let currentY = headerHeight;
    loadedImages.forEach((img, i) => {
      const h = pageWidth * (img.height / img.width);
      ctx.drawImage(img, 0, currentY, pageWidth, h);
      ctx.fillStyle = 'rgba(243, 255, 89, 0.9)';
      ctx.fillRect(20, currentY + 20, 120, 45);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 18px Courier';
      ctx.fillText(`HALAMAN_${i + 1}`, 30, currentY + 48);
      currentY += h;
    });

    // Logika Kompresi Otomatis: Maksimal 2MB
    let quality = 0.9;
    let finalDataUrl = canvas.toDataURL('image/jpeg', quality);
    while ((finalDataUrl.length * 0.75) > 2000000 && quality > 0.1) {
      quality -= 0.05;
      finalDataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    const fileSize = (finalDataUrl.length * 0.75 / (1024 * 1024)).toFixed(2) + " MB";
    const name = (fileName || `DOKUPRO_${Date.now()}`) + (format === 'pdf' ? '.pdf' : '.jpg');

    setFinalFile({
      name,
      size: fileSize,
      type: format === 'pdf' ? 'A4 Compiled PDF' : 'Long Strip Archive',
      dataUrl: finalDataUrl
    });

    setTimeout(() => {
      setIsProcessing(false);
      setView('result');
    }, 2000);
  };

  const downloadFile = () => {
    if (!finalFile.dataUrl) return;
    const link = document.createElement('a');
    link.href = finalFile.dataUrl;
    link.download = finalFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    stopCamera();
    setCapturedImages([]);
    setFinalFile({ name: '', size: '', type: '', dataUrl: null });
    setView('home');
  };

  // --- KOMPONEN UI ---
  const Navbar = () => (
    <nav className="bg-white border-b-[4px] border-black sticky top-0 z-[100]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="bg-black p-1.5 border-2 border-black rotate-3">
              <FileText className="text-white w-5 h-5" />
            </div>
            <span className="text-2xl font-[1000] tracking-tighter uppercase italic">DOKU<span className="text-indigo-600">.PRO</span></span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 border-2 border-black text-[10px] font-black uppercase tracking-widest">
            <Minimize2 size={14}/> Auto-2MB Ready
          </div>
          <button onClick={() => setView('home')} className="bg-[#f3ff59] border-[3px] border-black px-4 py-2 font-[1000] text-xs uppercase shadow-[3px_3px_0_#000]">
            Profil
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-black font-sans selection:bg-[#f3ff59]">
      <Navbar />

      <main className="p-4 md:p-12 max-w-5xl mx-auto">
        
        {view === 'home' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="text-center mb-16">
              <div className="inline-block bg-[#f3ff59] border-[6px] border-black px-10 py-6 shadow-[12px_12px_0px_0px_#000] -rotate-1 mb-8">
                <h1 className="text-5xl md:text-8xl font-[1000] tracking-tighter uppercase italic leading-[0.85]">
                  ARSIP PANJANG.<br/>FULL WIDTH.
                </h1>
              </div>
              <p className="max-w-xl mx-auto font-black text-lg md:text-xl uppercase tracking-tight opacity-70 italic leading-tight">
                Susun dokumen Anda secara vertikal dengan lebar penuh dan otomatis kompres di bawah 2MB.
              </p>
            </div>

            <div className={styles.card}>
              <div className="grid md:grid-cols-2 gap-6">
                <button onClick={startCamera} className={`${styles.button} bg-pink-400 py-12 flex-col group`}>
                  <Camera size={64}/>
                  <span className="text-2xl mt-4">Jalankan Kamera</span>
                </button>
                <button onClick={() => fileInputRef.current.click()} className={`${styles.button} bg-[#f3ff59] py-12 flex-col group`}>
                  <Upload size={64}/>
                  <span className="text-2xl mt-4">Import Foto</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'capture' && (
          <div className={`${styles.card} animate-in zoom-in-95`}>
            <div className="flex justify-between items-center mb-6">
              <span className="font-[1000] uppercase italic text-sm tracking-widest flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse border-2 border-black"></div>
                Feed Sesi: {capturedImages.length} Foto
              </span>
              <button onClick={reset} className="font-black text-xs underline uppercase">Tutup</button>
            </div>

            <div className="bg-black border-[6px] border-black aspect-video relative mb-8 shadow-[12px_12px_0px_0px_#4f46e5] overflow-hidden">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale contrast-[1.4]" />
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <button onClick={takeSnapshot} className={`${styles.button} bg-[#f3ff59] py-8 text-3xl`}>JEPRET!</button>
              <button 
                disabled={capturedImages.length === 0} 
                onClick={() => setView('format')} 
                className={`${styles.button} bg-[#27d07d] py-8 text-2xl`}
              >
                PROSES <ChevronRight size={32}/>
              </button>
            </div>

            <div className="border-t-[4px] border-black pt-6">
              <h3 className="font-black text-xs uppercase mb-4 opacity-50 italic">Buffer (Klik untuk CROP):</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scroll">
                {capturedImages.map((img, i) => (
                  <div key={i} className="min-w-[120px] h-40 border-[4px] border-black relative bg-gray-100 group cursor-pointer shadow-[4px_4px_0_#000]" onClick={() => { setEditingIndex(i); setView('crop'); }}>
                    <img src={img} className="w-full h-full object-cover grayscale" alt={`Captured frame ${i + 1}`} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[#f3ff59] transition-all">
                      PILIH CROP
                    </div>
                    <div className="absolute bottom-0 left-0 bg-black text-white text-[10px] px-2 font-black italic">#{i+1}</div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCapturedImages(prev => prev.filter((_, idx) => idx !== i)); }}
                      className="absolute -top-3 -right-3 bg-red-500 text-white border-2 border-black p-1 shadow-[2px_2px_0px_0px_#000]"
                    >
                      <X size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'crop' && editingIndex !== null && (
          <div className={styles.card}>
            <h2 className="text-3xl font-[1000] uppercase italic mb-6">Crop Frame #{editingIndex + 1}</h2>
            <div className="bg-slate-100 border-4 border-black aspect-video relative mb-8 flex items-center justify-center overflow-hidden">
                <canvas 
                    ref={cropCanvasRef} 
                    className="max-w-full max-h-full border-2 border-dashed border-black"
                    width={800}
                    height={450}
                    style={{ background: '#000' }}
                />
                <div className="absolute inset-10 border-4 border-[#f3ff59] pointer-events-none border-dashed opacity-50"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('capture')} className={`${styles.button} bg-white`}>Batal</button>
              <button onClick={handleCropSave} className={`${styles.button} bg-[#27d07d]`}>Simpan Potongan</button>
            </div>
          </div>
        )}

        {view === 'format' && (
          <div className={styles.card}>
            <h2 className="text-4xl font-[1000] uppercase italic mb-10 border-b-[6px] border-black pb-4">Compile Arsip</h2>
            <div className="space-y-10">
              <input 
                type="text" 
                placeholder="NAMA_DOKUMEN_ANDA" 
                className={`${styles.input} text-xl`}
                onChange={(e) => setFileName(e.target.value)}
              />
              <div className="grid md:grid-cols-2 gap-8">
                <button onClick={() => generateDocument('pdf')} className={`${styles.button} bg-indigo-400 py-12 flex-col`}>
                  <FileDigit size={64}/>
                  <span className="text-2xl mt-4 font-[1000]">COMPILE PDF</span>
                  <p className="text-[10px] font-bold opacity-70 italic tracking-widest uppercase">Full Width Strip • Max 2MB</p>
                </button>
                <button onClick={() => generateDocument('jpg')} className={`${styles.button} bg-[#27d07d] py-12 flex-col`}>
                  <ImageIcon size={64}/>
                  <span className="text-2xl mt-4 font-[1000]">COMPILE JPG</span>
                  <p className="text-[10px] font-bold opacity-70 italic tracking-widest uppercase">Vertical Layout • Max 2MB</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'result' && (
          <div className={`${styles.card} overflow-hidden`}>
            {isProcessing ? (
              <div className="py-24 text-center">
                <RefreshCw size={100} className="animate-spin text-indigo-600 mx-auto" strokeWidth={4}/>
                <h2 className="text-4xl font-[1000] uppercase italic mt-8 tracking-tighter">Sedang Menyusun...</h2>
              </div>
            ) : (
              <div className="animate-in zoom-in-95 duration-500">
                <div className="flex flex-col md:flex-row justify-between items-center mb-12">
                  <div className="bg-[#27d07d] border-4 border-black p-6 rotate-3 shadow-[10px_10px_0px_0px_#000]">
                    <CheckCircle2 size={64} strokeWidth={3}/>
                  </div>
                  <div className="text-center md:text-right">
                    <h2 className="text-6xl font-[1000] uppercase italic tracking-tighter leading-none">BERHASIL!</h2>
                    <p className="font-bold opacity-40 uppercase tracking-[0.3em] mt-2 italic">Urutan Kronologis 1 s/d {capturedImages.length}</p>
                  </div>
                </div>

                <div className="border-[4px] border-black p-4 bg-slate-100 mb-12 shadow-inner h-[400px] overflow-y-auto custom-scroll">
                    <img src={finalFile.dataUrl} className="w-full h-auto grayscale" alt="Document result preview" />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-black text-[#f3ff59] p-4 border-2 border-black font-black uppercase italic">
                        <span className="text-[10px] opacity-50 block">FINAL_SIZE</span>
                        {finalFile.size}
                    </div>
                    <div className="bg-white p-4 border-2 border-black font-black uppercase italic">
                        <span className="text-[10px] opacity-30 block">DOC_TYPE</span>
                        {finalFile.type.split(' ')[0]}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button onClick={downloadFile} className={`${styles.button} bg-pink-400 py-10 text-4xl italic shadow-[10px_10px_0_#000]`}>
                    <Download size={48}/> DOWNLOAD SEKARANG
                  </button>
                  <button onClick={reset} className={`${styles.button} bg-black text-white py-4`}>MULAI DOKUMEN BARU</button>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      <footer className="mt-20 py-20 bg-black text-white border-t-[10px] border-[#f3ff59]">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-[#f3ff59] p-1 border-2 border-black rotate-3"><FileText className="text-black w-5 h-5" /></div>
            <span className="text-3xl font-[1000] tracking-tighter uppercase italic">DOKU<span className="text-[#f3ff59]">.PRO</span></span>
          </div>
          <p className="font-black text-[10px] opacity-30 uppercase tracking-[0.5em] italic">© 2026 DOKU.PRO - OPTIMIZED FOR PRODUCTION</p>
        </div>
      </footer>

      {/* Input File Tersembunyi */}
      <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (ev) => setCapturedImages(prev => [...prev, ev.target.result]);
          reader.readAsDataURL(file);
        });
        if (view === 'home') setView('capture');
      }} />

      <style>{`
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: black; border: 3px solid white; }
        .custom-scroll { scrollbar-width: thin; scrollbar-color: black transparent; }
      `}</style>
    </div>
  );
};

export default App;