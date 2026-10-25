// Settlements that drive the sky-glow model: name | latitude | longitude | approximate urban
// population in thousands (rounded, built-up area where the town spills over its boundary).
// Includes the nearest large foreign cities, whose glow reaches the UK coast and Northern Ireland.
// This is a model input, not a gazetteer: small villages are left out on purpose.
const RAW = `
London|51.507|-0.128|9500
Birmingham|52.480|-1.898|1700
Wolverhampton|52.587|-2.128|300
Walsall|52.586|-1.982|200
Coventry|52.408|-1.511|400
Manchester|53.481|-2.237|1300
Bolton|53.578|-2.429|200
Oldham|53.541|-2.118|230
Stockport|53.409|-2.158|300
Rochdale|53.616|-2.155|110
Wigan|53.545|-2.632|100
Liverpool|53.408|-2.992|900
Birkenhead|53.393|-3.015|150
St Helens|53.454|-2.737|100
Southport|53.645|-3.005|90
Warrington|53.390|-2.597|210
Leeds|53.800|-1.549|800
Bradford|53.795|-1.759|530
Huddersfield|53.646|-1.785|150
Wakefield|53.683|-1.499|100
Sheffield|53.381|-1.470|600
Rotherham|53.430|-1.357|110
Barnsley|53.553|-1.479|90
Doncaster|53.523|-1.133|110
Chesterfield|53.235|-1.426|105
York|53.959|-1.081|210
Harrogate|53.992|-1.541|75
Scarborough|54.283|-0.400|60
Hull|53.744|-0.336|320
Grimsby|53.567|-0.081|90
Scunthorpe|53.588|-0.654|80
Lincoln|53.234|-0.538|130
Newcastle upon Tyne|54.978|-1.618|800
Sunderland|54.906|-1.381|280
Middlesbrough|54.574|-1.235|380
Hartlepool|54.690|-1.213|90
Darlington|54.523|-1.553|105
Durham|54.777|-1.575|50
Carlisle|54.892|-2.944|75
Kendal|54.328|-2.746|28
Barrow-in-Furness|54.111|-3.226|55
Workington|54.643|-3.547|25
Penrith|54.664|-2.752|16
Preston|53.759|-2.703|150
Blackpool|53.817|-3.050|240
Blackburn|53.748|-2.482|120
Burnley|53.789|-2.248|75
Lancaster|54.049|-2.801|52
Chester|53.190|-2.891|90
Crewe|53.098|-2.443|70
Stoke-on-Trent|53.003|-2.180|380
Stafford|52.805|-2.117|70
Telford|52.678|-2.445|170
Shrewsbury|52.707|-2.755|78
Hereford|52.056|-2.716|60
Worcester|52.192|-2.220|105
Redditch|52.306|-1.940|85
Leamington Spa|52.285|-1.534|60
Rugby|52.371|-1.265|75
Nuneaton|52.523|-1.465|90
Hinckley|52.541|-1.373|50
Leicester|52.637|-1.139|560
Loughborough|52.772|-1.205|65
Coalville|52.723|-1.370|38
Melton Mowbray|52.766|-0.886|28
Market Harborough|52.479|-0.920|24
Lutterworth|52.455|-1.200|10
Oakham|52.670|-0.729|11
Burton upon Trent|52.808|-1.636|75
Derby|52.922|-1.476|270
Nottingham|52.954|-1.150|750
Mansfield|53.143|-1.199|100
Newark-on-Trent|53.077|-0.808|28
Grantham|52.912|-0.640|45
Northampton|52.240|-0.903|250
Kettering|52.396|-0.727|60
Peterborough|52.573|-0.243|200
Cambridge|52.205|0.119|150
Bedford|52.136|-0.466|110
Luton|51.879|-0.418|260
Milton Keynes|52.041|-0.759|260
Stevenage|51.902|-0.202|90
Watford|51.656|-0.397|130
Norwich|52.629|1.293|230
Great Yarmouth|52.608|1.730|70
Lowestoft|52.475|1.751|70
King's Lynn|52.755|0.395|50
Ipswich|52.057|1.155|180
Bury St Edmunds|52.246|0.711|40
Colchester|51.889|0.903|130
Chelmsford|51.736|0.469|120
Basildon|51.576|0.488|110
Southend-on-Sea|51.538|0.714|300
Oxford|51.752|-1.258|160
Banbury|52.062|-1.340|47
Aylesbury|51.816|-0.808|70
High Wycombe|51.629|-0.748|120
Reading|51.454|-0.978|340
Slough|51.510|-0.595|160
Newbury|51.401|-1.323|45
Basingstoke|51.265|-1.087|110
Guildford|51.236|-0.570|80
Woking|51.319|-0.560|100
Crawley|51.109|-0.187|110
Brighton|50.823|-0.137|480
Worthing|50.814|-0.372|110
Chichester|50.836|-0.779|30
Eastbourne|50.768|0.290|100
Hastings|50.855|0.573|90
Tunbridge Wells|51.132|0.263|60
Maidstone|51.272|0.529|110
Medway|51.382|0.527|280
Canterbury|51.280|1.080|55
Ashford|51.147|0.876|75
Folkestone|51.081|1.169|50
Dover|51.129|1.309|35
Portsmouth|50.820|-1.088|600
Southampton|50.904|-1.404|450
Winchester|51.063|-1.317|45
Salisbury|51.069|-1.795|45
Newport (Isle of Wight)|50.700|-1.295|25
Swindon|51.558|-1.781|190
Gloucester|51.865|-2.244|150
Cheltenham|51.900|-2.078|120
Bath|51.381|-2.360|95
Bristol|51.454|-2.588|700
Weston-super-Mare|51.347|-2.977|80
Taunton|51.015|-3.103|70
Yeovil|50.942|-2.633|50
Bournemouth|50.720|-1.880|470
Weymouth|50.614|-2.457|53
Exeter|50.723|-3.527|140
Torquay|50.463|-3.525|120
Barnstaple|51.080|-4.058|25
Plymouth|50.375|-4.143|270
St Austell|50.340|-4.790|35
Truro|50.263|-5.051|25
Falmouth|50.152|-5.066|22
Camborne|50.213|-5.293|40
Penzance|50.119|-5.537|20
Newquay|50.412|-5.076|20
Cardiff|51.481|-3.179|410
Newport (Wales)|51.588|-2.998|150
Pontypridd|51.602|-3.342|60
Caerphilly|51.578|-3.218|45
Merthyr Tydfil|51.746|-3.378|45
Swansea|51.621|-3.944|240
Llanelli|51.684|-4.161|50
Carmarthen|51.857|-4.311|15
Haverfordwest|51.802|-4.971|14
Brecon|51.946|-3.389|8
Aberystwyth|52.415|-4.083|15
Newtown (Powys)|52.514|-3.314|11
Wrexham|53.046|-2.993|65
Rhyl|53.319|-3.490|45
Llandudno|53.324|-3.827|20
Bangor (Gwynedd)|53.228|-4.129|18
Glasgow|55.864|-4.252|1200
Paisley|55.846|-4.424|78
East Kilbride|55.764|-4.177|75
Motherwell|55.789|-3.992|120
Cumbernauld|55.946|-3.994|50
Greenock|55.947|-4.757|45
Kilmarnock|55.611|-4.495|46
Ayr|55.458|-4.629|46
Dumfries|55.071|-3.605|33
Stranraer|54.904|-5.025|10
Galashiels|55.617|-2.806|15
Edinburgh|55.953|-3.189|550
Livingston|55.883|-3.522|57
Falkirk|56.002|-3.784|70
Stirling|56.117|-3.937|37
Dunfermline|56.072|-3.452|55
Kirkcaldy|56.112|-3.158|50
Perth|56.396|-3.437|47
Dundee|56.462|-2.971|150
Aberdeen|57.149|-2.094|200
Peterhead|57.505|-1.784|18
Elgin|57.649|-3.317|24
Inverness|57.478|-4.225|65
Oban|56.415|-5.472|8
Fort William|56.817|-5.112|10
Wick|58.439|-3.094|7
Thurso|58.594|-3.522|8
Kirkwall|58.981|-2.960|9
Stornoway|58.209|-6.388|8
Lerwick|60.155|-1.145|7
Belfast|54.597|-5.930|640
Lisburn|54.510|-6.050|120
Bangor (County Down)|54.660|-5.668|62
Larne|54.853|-5.822|18
Ballymena|54.864|-6.280|30
Coleraine|55.133|-6.667|25
Derry|54.997|-7.309|85
Omagh|54.600|-7.300|20
Craigavon|54.447|-6.388|65
Newry|54.176|-6.340|27
Armagh|54.350|-6.653|15
Enniskillen|54.344|-7.640|14
Douglas (Isle of Man)|54.152|-4.482|27
St Helier|49.186|-2.107|35
Dublin|53.350|-6.260|1200
Calais|50.953|1.858|75
Dunkirk|51.034|2.377|90
Boulogne-sur-Mer|50.726|1.614|40
Lille|50.629|3.057|1100
`;

export const PLACES = RAW.trim()
  .split("\n")
  .map((line) => {
    const [name, lat, lon, pop] = line.split("|");
    return { name, lat: Number(lat), lon: Number(lon), pop: Number(pop) * 1000 };
  });
