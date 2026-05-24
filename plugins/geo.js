export default {
  name: 'geo',
  description: 'GeoJSON/TopoJSON visualization with Leaflet',
  
  test(code, language) {
    return language === 'geojson' || language === 'topojson';
  },
  
  topojsonToGeoJson(topology) {
    const result = {
      type: 'FeatureCollection',
      features: []
    };
    
    function decodeArc(arcIndex) {
      const arc = topology.arcs[arcIndex];
      const result = [];
      let x = 0, y = 0;
      for (let i = 0; i < arc.length; i++) {
        x += arc[i][0];
        y += arc[i][1];
        result.push([x, y]);
      }
      return result;
    }
    
    function transformGeometry(geometry) {
      const result = {
        type: geometry.type,
        coordinates: []
      };
      
      switch (geometry.type) {
        case 'Point':
          result.coordinates = geometry.coordinates;
          break;
        case 'LineString':
          result.coordinates = geometry.arcs.flatMap(arcIdx => decodeArc(arcIdx));
          break;
        case 'Polygon':
          result.coordinates = geometry.arcs.map(ring => ring.flatMap(arcIdx => decodeArc(arcIdx)));
          break;
        case 'MultiPoint':
          result.coordinates = geometry.coordinates;
          break;
        case 'MultiLineString':
          result.coordinates = geometry.arcs.map(line => line.flatMap(arcIdx => decodeArc(arcIdx)));
          break;
        case 'MultiPolygon':
          result.coordinates = geometry.arcs.map(polygon => polygon.map(ring => ring.flatMap(arcIdx => decodeArc(arcIdx))));
          break;
        case 'GeometryCollection':
          result.geometries = geometry.geometries.map(transformGeometry);
          delete result.coordinates;
          break;
      }
      
      return result;
    }
    
    for (const key in topology.objects) {
      const obj = topology.objects[key];
      if (obj.type === 'GeometryCollection') {
        obj.geometries.forEach(geom => {
          result.features.push({
            type: 'Feature',
            geometry: transformGeometry(geom),
            properties: {}
          });
        });
      } else if (obj.type === 'Polygon' || obj.type === 'LineString' || obj.type === 'Point') {
        result.features.push({
          type: 'Feature',
          geometry: transformGeometry(obj),
          properties: {}
        });
      }
    }
    
    return result;
  },
  
  render(code, container) {
    if (typeof L === 'undefined') {
      throw new Error('Leaflet library is not loaded');
    }
    
    let geoData;
    try {
      geoData = JSON.parse(code);
    } catch (error) {
      throw new Error('Invalid GeoJSON/TopoJSON data');
    }
    
    const map = L.map(container).setView([35.8617, 104.1954], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    const classList = container.closest ? container.closest('pre')?.querySelector('code')?.className : '';
    const languageMatch = classList ? classList.match(/language-(\S+)/) : null;
    const language = languageMatch ? languageMatch[1] : '';
    
    if (language === 'topojson') {
      geoData = this.topojsonToGeoJson(geoData);
    }
    
    L.geoJSON(geoData, {
      onEachFeature: function(feature, layer) {
        if (feature.properties && feature.properties.name) {
          layer.bindPopup(feature.properties.name);
        }
      }
    }).addTo(map);
    
    const bounds = map.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds);
    }
  }
};
