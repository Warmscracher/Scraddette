/**
 * The index of each array determines how many strikes the word gives.
 *
 * The second sub-array is for words that must be surrounded by a word boundary and the third is for words that must be preceded by a word
 * boundary.
 *
 * All words are ROT13-encoded.
 */
const badWords: [RegExp[]?, RegExp[]?, RegExp[]?][] = [
	[
		[
			/cbea/,
			/grfgvpyr/,
			/fpuzhpx/,
			/erpghz/,
			/ihyin/,
			/🖕/,
			/卐/,
			/fjnfgvxn/,
			/卍/,
			/lvss/,
			/ahg ?fnpx/,
		],
		[
			/intva(?:f|l|n|r|y)+/,
			/(?:urzv ?)?cravf(?:rf)?/,
			/nahf(?:rf)?/,
			/frzra/,
			/(?:c(?:bfg|er) ?)?phz/,
			/pyvg/,
			/gvg(?:(?:gvr)?f)?/,
			/chff(?:l|vrf)/,
			/fpebghz/,
			/ynovn/,
			/xlf/,
			/preivk/,
			/ubeal/,
			/obaref?/,
			/fcrez/,
		],
	],
	[
		[
			/fuv+r*g(?!nx(?:r|v))/,
			/rwnphyngr/,
			/fcyb+tr/,
			/oybj ?wbo/,
			/shpx/,
			/znfg(?:h|r)eong/,
			/ohgg ?cvengr/,
			/qvyqb/,
			/xhxfhtre/,
			/dhrrs/,
			/wnpx ?bss/,
			/wrex ?bss/,
			/ovg?pu/,
			/ubeal/,
		],
		[
			/wvm+z?/,
			/(?:ovt ?)?qvp?xr?(?: ?(?:q|l|evat|ef?|urnqf?|vre?|vat|f|jnqf?))?/,
			/(?:8|o)=+Q/,
			/fzhg+(?:e|fg?|l|vr)?/,
			/pbpx(?: ?svtug|fhpx|(?:fhpx|svtug)(?:re|vat)|znafuvc|hc)?f?/,
			/onfgneq(?:vfz|(?:e|y)?l|evrf|f)?/,
			/phagf?/,
			/shx/,
			/ovg?fu/,
			/jnax(?:v?ref?|v(?:at|rfg)|yr|f|l)?/,
		],
	],
	[
		[
			/puvat ?(?:punat ?)?puba/,
			/xvxr/,
			/pnecrg ?zhapure/,
			/fyhg/,
			/fur ?znyr/,
			/shqtr ?cnpxr/,
			/ergneq/,
		],
		[
			/tbbx(?:f|l)?/,
			/yrfobf?/,
			/fcvpf?/,
			/j?uber/,
			/av+t{2,}(?:(?:h|r)?e|n)(?: ?rq|l|qbz|urnq|vat|vf(?:u|z)|yvat)?f?/,
			/snv?t+(?:rq|vr(?:e|fg)|va|vg|bgf?|bge?l|l)?f?/,
			/wnc(?:rq?|r?f|vatf?|crq|cvat|cn)?/,
		],
	],
];

if (process.env.NODE_ENV !== "production") badWords[1]?.[0].push(/nhgbzbqzhgr/);

export default badWords;
