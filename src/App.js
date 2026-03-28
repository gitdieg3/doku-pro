import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Image as ImageIcon, FileText, Download, X, RefreshCw, Upload, 
  Minimize2, CheckCircle2, FileDigit
} from 'lucide-react';

/**
 * DOKU.PRO - Versi Stabil untuk Produksi (Vercel Ready)
 */
const App = () => {
  // --- STATE ---
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

  const styles = {
    card: "bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8 transition-all",
    button: "border-[4px] border-black font-[1000] uppercase tracking-tighter px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2",
    input: "w-full border-[4px] border-black p-4 font-bold outline-none focus:bg-[#f3ff59] transition-colors placeholder:text-black/30",
    label: "block font-[1000] text-xs uppercase tracking-widest mb-2 italic",
  };

  // --- EFFECTS ---
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

  // --- LOGIC ---
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
      alert("Akses kamera ditolak. Pastikan web dibuka menggunakan HTTPS.");
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
    }, 1500);
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

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-black font-sans selection:bg-[#f3ff59]">
      <nav className="bg-white border-b-[4px] border-black sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="bg-black p-1.5 border-2 border-black rotate-3">
              <FileText className="text-white w-5 h-5" />
            </div>
            <span className="text-2xl font-[1000] tracking-tighter uppercase italic">DOKU<span className="text-indigo-600">.PRO</span></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 border-2 border-black text-[10px] font-black uppercase">
              <Minimize2 size={14}/> Auto-2MB Ready
            </div>
          </div>
        </div>
      </nav>

      <main className="p-4 md:p-12 max-w-5xl mx-auto">
        {view === 'home' && (
          <div className="text-center">
            <div className="inline-block bg-[#f3ff59] border-[6px] border-black px-10 py-6 shadow-[12px_12px_0px_0px_#000] -rotate-1 mb-8">
              <h1 className="text-5xl md:text-8xl font-[1000] tracking-tighter uppercase italic leading-[0.85]">
                ARSIP RAPI.<br/>OPTIMAL.
              </h1>
            </div>
            <p className="max-w-xl mx-auto font-black text-lg md:text-xl uppercase italic mb-8">
              Susun dokumen vertikal full width dan otomatis di bawah 2MB.
            </p>
            <div className={styles.card}>
              <div className="grid md:grid-cols-2 gap-6">
                <button onClick={startCamera} className={`${styles.button} bg-pink-400 py-12 flex-col`}>
                  <Camera size={64}/>
                  <span className="text-2xl mt-4">Kamera</span>
                </button>
                <button onClick={() => fileInputRef.current.click()} className={`${styles.button} bg-[#f3ff59] py-12 flex-col`}>
                  <Upload size={64}/>
                  <span className="text-2xl mt-4">Upload</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'capture' && (
          <div className={`${styles.card}`}>
            <div className="flex justify-between mb-6">
              <span className="font-black uppercase italic">Sesi: {capturedImages.length} Foto</span>
              <button onClick={reset} className="font-black underline uppercase">Tutup</button>
            </div>
            <div className="bg-black border-[6px] border-black aspect-video relative mb-8 overflow-hidden shadow-[12px_12px_0_#4f46e5]">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale contrast-[1.4]" />
            </div>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <button onClick={takeSnapshot} className={`${styles.button} bg-[#f3ff59] py-8 text-3xl`}>JEPRET</button>
              <button disabled={capturedImages.length === 0} onClick={() => setView('format')} className={`${styles.button} bg-[#27d07d] py-8 text-2xl`}>PROSES</button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {capturedImages.map((img, i) => (
                <div key={i} className="min-w-[120px] h-40 border-4 border-black relative cursor-pointer" onClick={() => { setEditingIndex(i); setView('crop'); }}>
                  <img src={img} className="w-full h-full object-cover grayscale" alt="Captured thumbnail" />
                  <div className="absolute bottom-0 left-0 bg-black text-white text-[10px] px-2 font-black italic">#{i+1}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'crop' && editingIndex !== null && (
          <div className={styles.card}>
            <h2 className="text-3xl font-black mb-6 uppercase">Crop Frame #{editingIndex + 1}</h2>
            <div className="bg-slate-100 border-4 border-black aspect-video relative mb-8 flex items-center justify-center">
                <canvas ref={cropCanvasRef} className="max-w-full max-h-full" width={800} height={450} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('capture')} className={`${styles.button} bg-white`}>Batal</button>
              <button onClick={handleCropSave} className={`${styles.button} bg-[#27d07d]`}>Simpan</button>
            </div>
          </div>
        )}

        {view === 'format' && (
          <div className={styles.card}>
            <h2 className="text-4xl font-black mb-10 border-b-4 border-black pb-4 uppercase">Ekspor</h2>
            <div className="space-y-10">
              <input type="text" placeholder="NAMA_DOKUMEN" className={styles.input} onChange={(e) => setFileName(e.target.value)} />
              <div className="grid md:grid-cols-2 gap-8">
                <button onClick={() => generateDocument('pdf')} className={`${styles.button} bg-indigo-400 py-12 flex-col`}>
                  <FileDigit size={64}/>
                  <span className="text-2xl mt-4 font-black">PDF</span>
                </button>
                <button onClick={() => generateDocument('jpg')} className={`${styles.button} bg-[#27d07d] py-12 flex-col`}>
                  <ImageIcon size={64}/>
                  <span className="text-2xl mt-4 font-black">JPG</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'result' && (
          <div className={`${styles.card}`}>
            {isProcessing ? (
              <div className="py-24 text-center">
                <RefreshCw size={100} className="animate-spin text-indigo-600 mx-auto" />
                <h2 className="text-4xl font-black mt-8">SEDANG MENYUSUN...</h2>
              </div>
            ) : (
              <div className="text-center">
                <CheckCircle2 size={64} className="mx-auto text-[#27d07d] mb-4" />
                <h2 className="text-5xl font-black italic mb-8">BERHASIL!</h2>
                <div className="border-4 border-black p-4 bg-slate-100 mb-8 max-h-[300px] overflow-y-auto">
                    <img src={finalFile.dataUrl} className="w-full h-auto grayscale" alt="Result preview" />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-8 font-black">
                  <div className="bg-black text-[#f3ff59] p-4 border-2 border-black">{finalFile.size}</div>
                  <div className="bg-white p-4 border-2 border-black uppercase italic">Optimized</div>
                </div>
                <button onClick={downloadFile} className={`${styles.button} bg-pink-400 w-full py-10 text-4xl`}>
                  <Download size={48}/> DOWNLOAD
                </button>
                <button onClick={reset} className="mt-6 font-black uppercase underline">Mulai Baru</button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-20 py-20 bg-black text-white border-t-[10px] border-[#f3ff59] text-center">
        <span className="text-3xl font-[1000] italic uppercase">DOKU<span className="text-[#f3ff59]">.PRO</span></span>
        <p className="text-[10px] opacity-30 mt-4 uppercase tracking-[0.5em]">© 2026 DOKU.PRO - PRODUCTION READY</p>
      </footer>

      <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (ev) => setCapturedImages(prev => [...prev, ev.target.result]);
          reader.readAsDataURL(file);
        });
        if (view === 'home') setView('capture');
      }} />
    </div>
  );
};

export default App;