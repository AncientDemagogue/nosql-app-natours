export const displayMap = (locations) => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiYXBvbG9uIiwiYSI6ImNrMXl1dDdhZjBwNzAzbnFlN3Q2Nmg5YjgifQ.IilAd4IPFJS5OXF5lHBT5Q';
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/apolon/ck1yv2t762sno1co7p632bwtn',
        scrollZoom: false
        // center: [-118, 34],
        // zoom: 9,
        // interactive: false

    });

    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach(loc => {
        // create a marker
        const el = document.createElement('div');
        el.className = 'marker';

        // add a marker
        new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        }).setLngLat(loc.coordinates).addTo(map);

        // add popup

        new mapboxgl.Popup({
                offset: 30
            })
            .setLngLat(loc.coordinates)
            .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
            .addTo(map);

        // extend map bounds to include current location
        bounds.extend(loc.coordinates);
    });

    // set the paddign of the map
    map.fitBounds(bounds, {
        padding: {
            top: 200,
            bottom: 150,
            left: 100,
            right: 100
        }
    });
}