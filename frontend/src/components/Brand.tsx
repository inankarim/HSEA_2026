import supercreate from "../assets/Supercrete.1.png";
import supercreate_plus from "../assets/SupercretePlus.png";
import holcim_water from "../assets/HolcimWaterProtect.4.png";
import holcimstrong from "../assets/HolcimStrongStructure.4.png"
import holcimcoastal from "../assets/Holcim Coastal Guard.webp"

const Brand = () => {
  const products = [
    {
      title: "HOLCIM STRONG STRUCTURE",
      description: "Holcim (Strong Structure), a Portland Composite Cement (PCC) complies with BDS EN 197-1:2003, CEM II/B-M (S-V-L), 42.5N standard. The usage of this type of cement started from last few decades in Bangladesh.",
      productlink: "https://www.facebook.com/reel/1093178833355848/?s=single_unit",
      image: holcimstrong
    },
    {
      title: "HOLCIM WATER PROTECT",
      description: "A unique tailor made product that addresses the key problems of water seepage, dampness and water ingress that are of significant concern for home builders. Holcim Water Protect a Portland Composite Cement (PCC) complies with BDS EN 197-1:2010, CEM II/B-M (V-S-L), 42.5N standard.",
      productlink: "https://www.facebook.com/reel/1093178833355848/?s=single_unit",
      image: holcim_water
    },
    {
      title: "HOLCIM COASTAL GUARD",
      description: "Holcim Coastal Guard is a low-carbon sulphate-resisting pozzolanic cement developed for salinity- and sulphate-rich soil and water environments, particularly in Bangladesh’s coastal regions (approximately 32% of the land area).",
      productlink: "https://www.facebook.com/reel/1093178833355848/?s=single_unit",
      image: holcimcoastal
    },
    {
      title: "SUPERCRETE",
      description: "Supercrete, the only Portland Limestone Cement (PLC) brand in Bangladesh, complies with BDS EN 197-1: 2003, CEM II/ B-L, 42.5N standard. Own clinker production facility and usage ensure the consistent quality of the Cement.",
      productlink: "https://www.facebook.com/reel/1093178833355848/?s=single_unit",
      image: supercreate
    },
    {
      title: "SUPERCRETE PLUS",
      description: "Supercrete Plus is the number one Fair Face cement in Bangladesh with “CPR (Concrete Porosity Reduction) & Strength Enhancing Technology” that enhances superior bonding and ensures high strength.",
      productlink: "https://www.facebook.com/reel/1093178833355848/?s=single_unit",
      image: supercreate_plus
    },
  ];

  return (
    <div className="w-full py-12 px-4 md:px-8 bg-white">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-[#0A192F] mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: '700' }}>
          Our Products and Brands
        </h2>
        <p className="text-gray-500 text-base" style={{ fontFamily: 'Open Sans, sans-serif' }}>
          {products.length} Results
        </p>
      </div>

      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product, index) => (
            <div
              key={index}
              className="flex flex-col bg-white"
              style={{
                animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
              }}
            >
              {/* Image Container */}
              <div className="relative w-full h-64 md:h-72 lg:h-80 flex items-center justify-center  mb-6 overflow-hidden group">
                <img
                  src={product.image}
                  alt={product.title}
                  className="h-full object-contain px-4 transition-transform duration-500 ease-out group-hover:scale-110"
                />
              </div>

              {/* Content Container */}
              <div className="flex flex-col flex-grow">
                {/* Title */}
                <h3 className="text-lg md:text-xl font-bold text-[#0A192F] mb-3" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: '600' }}>
                  {product.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 text-sm leading-relaxed flex-grow" style={{ fontFamily: 'Open Sans, sans-serif', lineHeight: '1.6' }}>
                  {product.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Brand;