import { Link } from '../router';
import { useCMS } from '../lib/cms';

export default function PolicyPage() {
  const cms = useCMS();
  return (
    <main className="bg-cream min-h-screen pt-20 md:pt-24 pb-20">
      <div className="mx-auto max-w-2xl px-6">
        <Link to="/" className="text-stone text-[0.6rem] tracking-[0.3em] uppercase font-light hover:text-navy transition-colors">← الرئيسية</Link>
        
        <h1 className="font-serif text-3xl text-charcoal font-light mt-8 tracking-wide">سياسة الخصوصية</h1>
        <p className="text-stone text-xs mt-2">Privacy Policy — Last updated 2026</p>
        
        <div className="mt-10 space-y-8 text-stone text-sm font-light leading-[2]">
          <section>
            <h2 className="text-charcoal text-base font-light mb-3">جمع البيانات</h2>
            <p>نجمع البيانات التالية عند إتمام الطلب: الاسم، رقم الهاتف، البريد الإلكتروني، وعنوان الشحن. هذه البيانات ضرورية لمعالجة طلبك وتوصيله.</p>
          </section>
          <section>
            <h2 className="text-charcoal text-base font-light mb-3">استخدام البيانات</h2>
            <p>نستخدم بياناتك فقط لـ: معالجة الطلبات، التواصل بخصوص طلبك، إرسال تحديثات المجموعات الجديدة (في حال الاشتراك). لا نبيع أو نشارك بياناتك مع أي طرف ثالث.</p>
          </section>
          <section>
            <h2 className="text-charcoal text-base font-light mb-3">حماية البيانات</h2>
            <p>بياناتك محمية بتشفير SSL ومخزنة في خوادم آمنة. نتبع أفضل الممارسات في حماية البيانات.</p>
          </section>
          <section>
            <h2 className="text-charcoal text-base font-light mb-3">ملفات تعريف الارتباط</h2>
            <p>نستخدم localStorage لحفظ تفضيلاتك وسلة المشتريات. لا نستخدم cookies لتتبع سلوكك.</p>
          </section>
          <section>
            <h2 className="text-charcoal text-base font-light mb-3">حقوقك</h2>
            <p>يمكنك طلب حذف بياناتك في أي وقت عبر التواصل معنا على واتساب ({cms.brand_phone}) أو البريد الإلكتروني.</p>
          </section>
          <section>
            <h2 className="text-charcoal text-base font-light mb-3">التواصل</h2>
            <p>{cms.brand_name} — Port Said, Egypt</p>
            <p>WhatsApp: {cms.brand_phone}</p>
          </section>
        </div>

        <div className="w-10 h-px bg-sand mt-16 mb-16" />

        <h1 className="font-serif text-3xl text-charcoal font-light tracking-wide">شروط الاستخدام</h1>
        <p className="text-stone text-xs mt-2">Terms of Service</p>

        <div className="mt-10 space-y-8 text-stone text-sm font-light leading-[2]">
          <section>
            <h2 className="text-charcoal text-base font-light mb-3">الطلبات</h2>
            <p>بتقديم طلب عبر الموقع، أنت توافق على شروطنا. جميع الأسعار بالجنيه المصري (EGP) وشاملة الضرائب. أسعار الشحن تُضاف عند إتمام الطلب.</p>
          </section>
          <section>
            <h2 className="text-charcoal text-base font-light mb-3">الدفع</h2>
            <p>نقبل الدفع عند الاستلام أو بالتحويل البنكي. سيتم التواصل معك عبر واتساب لتأكيد طريقة الدفع بعد تقديم الطلب.</p>
          </section>
          <section>
            <h2 className="text-charcoal text-base font-light mb-3">الشحن والتوصيل</h2>
            <p>مدة التوصيل: بورسعيد 1-2 يوم، القاهرة والإسكندرية 2-3 أيام، باقي المحافظات 3-5 أيام. المدد تقريبية وقد تختلف.</p>
          </section>
          <section>
            <h2 className="text-charcoal text-base font-light mb-3">الاستبدال والاسترجاع</h2>
            <p>يمكن استبدال المنتج خلال 14 يوم من الاستلام بشرط أن يكون في حالته الأصلية مع جميع العلامات. تكلفة شحن الاسترجاع على المشتري.</p>
          </section>
          <section>
            <h2 className="text-charcoal text-base font-light mb-3">الملكية الفكرية</h2>
            <p>جميع المحتويات والتصميمات والعلامات التجارية على هذا الموقع ملك لـ {cms.brand_name}. يُمنع النسخ أو الاستخدام بدون إذن.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
