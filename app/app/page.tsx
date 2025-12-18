export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#0f2640] mb-4">
          Welcome to TassuKaveri
        </h1>
        <p className="text-lg text-[#6b7280] mb-8">
          Credit-based pet-sitting exchange platform for Finland
        </p>
        <a 
          href="/dashboard"
          className="inline-block bg-[#ff7a2d] text-white px-6 py-3 rounded-lg hover:bg-[#e66a1f] transition-colors font-medium"
        >
          Get Started
        </a>
      </div>
    </div>
  );
}
