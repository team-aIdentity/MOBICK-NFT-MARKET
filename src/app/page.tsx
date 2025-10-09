import Header from "@/components/Header";
import Hero from "@/components/Hero";
import NFTGrid from "@/components/NFTGrid";
// import ContractIntegration from "@/components/ContractIntegration"; // 임시 비활성화
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <NFTGrid />
        {/* <ContractIntegration /> 임시 비활성화 */}
      </main>
      <Footer />
    </div>
  );
}
