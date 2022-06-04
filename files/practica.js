d3.json('practica_airbnb.json')
    .then((featureCollection) => {
        setTimeout(drawMap(featureCollection), 10000)
    });


/*  - Enunciado -
    Crear un mapa con los barrios de la ciudad de Madrid y 
    pintarlos por colores según el precio medio del alquiler en el barrio.
*/

function drawMap(featureCollection) {

    // ---------------------------------------------------
    // 1. CREACIÓN DE LIENZOS
    // ---------------------------------------------------

    // 1.1 definir ancho y alto
    var ratio = window.devicePixelRatio || 1;
    var width = window.screen.availWidth * ratio
    var height = window.screen.availHeight * ratio

    // 1.2 Definimos tamaño de los 3 lienzos
    var w_svg_l, h_svg_l, w_svg_m, h_svg_m, w_svg_g, h_svg_g
    if (width > height) {
        w_svg_m = (width / 2) - 100
        h_svg_m = height * (3/4)
        w_svg_g = (width / 2) - 200
        h_svg_g = height / 2
    } else {
        w_svg_m = width
        h_svg_m = width
        w_svg_g = width
        h_svg_g = width / 2
    }

    // 1.3 Creamos los lienzos (legenda + mapa y gráfico)
    var svg_map = d3
        .select('div')
        .append('svg')
        .attr('width', w_svg_m)
        .attr('height', h_svg_m)
        .append('g');
    var svg_graph = d3
        .select('div')
        .append('svg')
        .attr('width', w_svg_g)
        .attr('height', h_svg_g) // 'g' la crearemos cuando hagamos click

    // ---------------------------------------------------
    // 2. LOS DATOS
    // ---------------------------------------------------

    // 2.1 Buscamos el centro del mapa (featureCollection)
    var center = d3.geoCentroid(featureCollection); //Encontrar la coordenada central del mapa (de la featureCollection)

    // 2.2 Definimos la proyección (támaño de mapa, los datos, etc)
    var projection = d3.geoMercator()
        .fitExtent([[0, 50], [w_svg_m, h_svg_m]], featureCollection)
    
    // 2.3 Creamos "paths" a partir de la proyección 
    var pathProjection = d3.geoPath().projection(projection);

    // 2.4 Buscamos los precios mínimo y máximos, nos servirá para despues.
    var price_min = d3.min(featureCollection.features, d => d.properties.avgprice);
    var price_max = d3.max(featureCollection.features, d => d.properties.avgprice);

    // ---------------------------------------------------
    // 3. LA LEYENDA
    // ---------------------------------------------------
    
    // 3.1 Escala de colores (en este caso secuencial, de verde a rojo)
    var scaleColor = d3
        .scaleSequential(["green", "red"])
        .domain([price_min, price_max]);

    // 3.2 La leyenda estará formada por cuadros, definimos los parámetros
    // valores de leyenda
    var price_step = 15;
    var legend_values = d3.range(price_min, price_max, price_step);
    
    // 3.3 definimos la escala, para definir los valores dentro del margen
    var scaleLegend = d3.scaleLinear()
        .domain([price_min, price_max])
        .range([0, w_svg_m - price_step]);

    // 3.4 Tamaño del recuadro
    var space = 1
    var widthRect = (w_svg_m / legend_values.length) - space;
    var heightRect = 10;
    
    // 3.5 Creación de la leyenda (rectangulos y textos)
    var legend = svg_map.append("g")
        .selectAll("rect")
        .data(legend_values)
        .enter()
        .append("rect")
        .attr("width", widthRect)
        .attr("height", heightRect)
        .attr("x", (d, i) => scaleLegend(d))
        .attr("fill", (d) => scaleColor(d));
    var text_legend = svg_map.append("g")
        .selectAll("text")
        .data(legend_values)
        .enter()
        .append("text")
        .attr("x", (d, i) => scaleLegend(d))
        .attr("y", heightRect * 2.5)
        .text((d) => "[" + d + "," + (d + price_step) + ")")
        .attr("font-size", 12);

    // ---------------------------------------------------
    // 3. El MAPA
    // ---------------------------------------------------

    // 3.1 Creamos el mapa mediante las "path"
    var createdPath = svg_map.selectAll('path')
        .data(featureCollection.features)
        .enter()
        .append('path')
        .attr('d', (d) => pathProjection(d))
        .attr("opacity", 1);

    // 3.2 Rellenamos con el color dependiendo del precio
    createdPath
        .attr('fill', (d) => scaleColor(d.properties.avgprice));

    // 3.3 Le añadimos eventos de retón
    createdPath
        .on("click", handleClick)
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);

    // ---------------------------------------------------
    // 4. Eventos
    // ---------------------------------------------------

    // 4.1 Creamos la variable tooltip
    var tooltip = d3.select("div")
        .append('div')
        .attr('class', 'tooltip')
        .style('visibility', 'hidden')
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px");

    // 4.2 Evento MouseOver -> transparenta la selección en el mapa y aparece tooltip
    function handleMouseOver(event, d) {
        d3.select(this)
            .transition()
            .duration(500)
            .attr("opacity", 0.5)
        tooltip
            .style("left", (event.pageX + 20) + "px")
            .style("top", (event.pageY - 30) + "px")
            .style("visibility", "visible")
            .text(d.properties.name + ": " +
                d.properties.avgprice + "") 
    }

    // 4.3 Evento MouseOut -> opaca la selección en el mapa y desaparece tooltip
    function handleMouseOut(event, d) {
        d3.select(this)
            .transition()
            .duration(500)
            .attr("opacity", 1)
        tooltip.style("visibility", "hidden")
    }

    // 4.3 Evento Click -> colorea o descolorea de amarillo la selección del mapa y crea la gráfica
    function handleClick(event, d) {
        function getcolor(obj) {return d3.select(obj).attr("fill")};
        function setcolor(obj, color) {d3.select(obj).attr("fill", color)};
        function setscaledcolor() {createdPath.attr('fill', (d) => scaleColor(d.properties.avgprice))};

        // Borro mí gráfica si la hubiera
        svg_graph.selectAll("g").remove();

        // Coloreo y creo gráfica si hubiera datos
        if (getcolor(this) == "yellow") {
            setscaledcolor()
        } else if (getcolor(this) == null) {
            setscaledcolor()
            setcolor(this, "yellow")
        } else {
            setscaledcolor()
            setcolor(this, "yellow")
            drawChart(d.properties, svg_graph);
        }
    }
}

/*  - Enunciado -
    Crear una gráfica que en el eje Y tenga el número de propiedades y 
    en el eje X el número de habitaciones de UN barrio (Se puede tomar un barrio solo, 
    pero sería recomendable que al hacer click en el mapa los datos de la gráfica cambien).
*/
function drawChart(neighborhood, svg_graph) {

    // ---------------------------------------------------
    // 5. CREACIÓN DE LA GRÁFICA
    // ---------------------------------------------------

    // 5.1 Tratamiento de datos (agrupamos para crear nuestro dataset, limpiamos undefined)
    var dataset = new Map(); 
    neighborhood.avgbedrooms.forEach(function (d) {
        if (d.bedrooms != undefined) {
            dataset.set(d.bedrooms, d.total)
        }
    });

    // 5.2 Creamos el lienzo con un margen
    var margen = 100
    svg_graph
        .append('g')
        .attr("transform", "translate(" + margen + ", " + margen + ")")
    var width = parseInt(svg_graph.style("width")) - (2*margen); // recogemos el ancho de svg
    var height = parseInt(svg_graph.style("height")) - (2*margen); // recogemos el alto de svg
    
    // 5.3 Definimos las escalas y ejes
    // Variables
    var bedrooms_min = 0;
    var bedrooms_max = d3.max(dataset.keys());
    var properties_min = 0;
    var properties_max = d3.max(dataset.values());

    // Escalas
    var scaleX = d3.scaleBand().domain(dataset.keys()).range([0, width]).padding(0.1);
    var scaleY = d3.scaleLinear().domain([properties_min, properties_max]).range([height, 0]);

    //Creacion de escala de colores.
    var scaleColor = d3.scaleSequential(d3.interpolateCool).domain([properties_min, properties_max])
        
    // Ejes
    var x_axis = d3.axisBottom(scaleX);
    var y_axis = d3.axisLeft(scaleY);

    // 5.4 Pintamos los ejes en el lienzo
    svg_graph
        .select("g")
        .append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(x_axis);
    svg_graph
        .select("g")
        .append("g")
        .call(y_axis)

    // 5.5 Pintamos las barras para el gráfico
    var rectangles = svg_graph
        .select("g")
        .append("g")
        .selectAll("rect")
        .data(dataset)
        .enter()
        .append("rect")
        .attr("x", d => scaleX(d[0]))
        .attr("y", d => scaleY(0))
        .attr("width", scaleX.bandwidth())
        .attr("height", d => 0)
        .attr("fill", d => scaleColor(d[1]))
        .attr("opacity", 1)
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);

    // Animación
    rectangles
        .transition("t1")
        .ease(d3.easeExpInOut)
        .duration(1250)
        .delay((d, i) => i * 100)
        .attr("y", d => scaleY(d[1]))
        .attr("height", d => height - scaleY(d[1]));

    // 5.6 definimos texto sobre cada rectángulo (se hará visible mediante evento MouseOver)
    var value_text = svg_graph
        .select("g")
        .append("g")
        .selectAll("text")
        .data(dataset)
        .enter()
        .append("text")
        .attr("id", (d, i) => "text" + d[0])
        .attr("x", d => scaleX(d[0]) + scaleX.bandwidth() / 2)
        .attr("y", d => scaleY(d[1]) -10)
        .style("text-anchor", "middle")
        .attr("opacity", 0)
        .text(d => d[1])
        .attr("fill", d => scaleColor(d[1]));

    // Damos nombre a la figura
    var text_x = svg_graph
        .select("g")
        .append("g")
        .append("text")
        .attr("x", width/2)
        .attr("y", height + 50)
        .style("text-anchor", "middle")
        .text("Y: Nº Propiedades | X: Nº Habitaciones")

    // Damos título a la figura
    var text_x = svg_graph
        .select("g")
        .append("g")
        .append("text")
        .attr("x", width/2)
        .attr("y", - 30)
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .text(neighborhood.name)

    // 5.7 Eventos MouseOver (hace visible texto)
    function handleMouseOver(event, d) {
        d3.select(this)
            .transition()
            .duration(500)
            .attr("opacity", 0.5)
        d3.select("#text" + d[0])
            .transition()
            .duration(400)
            .style("opacity", 1);
    }

    // 5.8 Eventos MouseOut (hace invisible el texto)
    function handleMouseOut(event, d) {
        d3.select(this)
            .transition()
            .duration(500)
            .attr("opacity", 1)
        d3.select("#text" + d[0])
            .transition()
            .duration(400)
            .style("opacity", 0);
    }
}

