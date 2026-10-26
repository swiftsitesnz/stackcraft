export const offerCopy={
 kicker:'ƯU ĐÃI RA MẮT · ĐÀ NẴNG',
 body:'Áp dụng cho tất cả dịch vụ, kể cả gói định kỳ.',
 eligibility:'Dành riêng cho doanh nghiệp Việt Nam đang hoạt động tại Đà Nẵng.',
 deadline:'Ký hợp đồng trước ngày 30/11/2026.',
 recurring:'Gói định kỳ: giảm 50% trong tối đa 12 tháng kể từ ngày ký hợp đồng, sau đó áp dụng mức giá thông thường đã thỏa thuận.',
 smallterms:'Áp dụng cho phí dịch vụ cơ bản; không bao gồm thuế và chi phí bên thứ ba.',
 cta:'Trao đổi về ưu đãi'
};

export function danangOffer(path){
 const w=offerCopy;
 return `<section class="danang-offer" id="da-nang-offer" aria-labelledby="offer-title"><div class="shell"><div class="offer-panel"><div class="offer-discount"><p class="offer-kicker">${w.kicker}</p><h2 id="offer-title"><span class="offer-reduction">GIẢM</span><strong>50<span>%</span></strong></h2><p class="offer-base">Phí dịch vụ cơ bản</p></div><div class="offer-message"><h3>${w.body}</h3><p class="offer-eligibility">${w.eligibility}</p><p class="offer-deadline"><span aria-hidden="true">↗</span> ${w.deadline}</p><a class="offer-cta" href="${path('contact')}?offer=danang-2026">${w.cta} <span aria-hidden="true">↗</span></a></div><div class="offer-terms"><p>${w.recurring}</p><p>${w.smallterms}</p></div></div></div></section>`;
}
