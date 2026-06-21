import { useState } from 'react';

interface SizeGuideProps {
  category: string;
}

const sizeData = {
  tops: {
    headers: ['Size', 'Chest (cm)', 'Length (cm)', 'Shoulder (cm)'],
    rows: [
      ['XS', '96', '68', '42'],
      ['S', '100', '70', '44'],
      ['M', '106', '72', '46'],
      ['L', '112', '74', '48'],
      ['XL', '118', '76', '50'],
      ['XXL', '124', '78', '52'],
    ],
  },
};

export default function SizeGuide({ category: _category }: SizeGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const data = sizeData.tops; // simplified — can expand per category later

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light underline underline-offset-4 hover:text-navy transition-colors duration-500"
      >
        دليل المقاسات — Size Guide
      </button>

      {/* Modal */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[80] bg-navy/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-6">
            <div className="bg-cream max-w-lg w-full max-h-[80vh] overflow-auto p-8 md:p-12 relative">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 text-stone hover:text-charcoal transition-colors"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="0.75" />
                </svg>
              </button>

              <span className="text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light">
                Size Guide
              </span>
              <h3 className="font-serif text-2xl text-charcoal font-light mt-4 tracking-wide">
                دليل المقاسات
              </h3>

              <div className="w-8 h-px bg-navy/30 mt-6" />

              <p className="mt-6 text-stone text-sm font-light leading-relaxed">
                All measurements are in centimeters. For a relaxed fit, we recommend sizing up.
              </p>

              {/* Table */}
              <div className="mt-8 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-sand">
                      {data.headers.map((h) => (
                        <th
                          key={h}
                          className="py-3 px-2 text-left text-[0.6rem] tracking-[0.2em] uppercase text-stone font-light"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, i) => (
                      <tr key={i} className="border-b border-sand/50">
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className={`py-3 px-2 font-light ${
                              j === 0 ? 'text-charcoal' : 'text-stone'
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-8 text-stone/60 text-[0.65rem] font-light leading-relaxed">
                Model wears size M. Height: 183cm / Chest: 96cm.
                <br />
                المودل يرتدي مقاس M. الطول: ١٨٣ سم / الصدر: ٩٦ سم.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
