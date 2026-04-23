/**
 * SEO Component
 * Provides comprehensive SEO optimization for RealApex public pages
 * 
 * Features:
 * - Dynamic meta tags (title, description, keywords)
 * - Open Graph tags for Facebook, LinkedIn sharing
 * - Twitter Card tags
 * - JSON-LD structured data for real estate
 * - Canonical URLs
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://realapex.in';

/**
 * SEO Head Component
 * @param {string} title - Page title
 * @param {string} description - Page description
 * @param {string} keywords - Keywords for SEO
 * @param {string} image - Image URL for social sharing
 * @param {string} url - Canonical URL
 * @param {string} type - Page type (website, article, product)
 * @param {object} structuredData - JSON-LD structured data
 */
export const SEOHead = ({
  title = 'RealApex - Real Estate ERP Solution',
  description = 'Comprehensive Real Estate ERP platform for property management, sales tracking, and business automation in India.',
  keywords = 'real estate, ERP, property management, CRM, India, plots, apartments, villas',
  image = '/og-image.png',
  url = '',
  type = 'website',
  structuredData = null,
  noindex = false
}) => {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const fullImage = image.startsWith('http') ? image : `${BASE_URL}${image}`;
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={fullUrl} />
      
      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:site_name" content="RealApex" />
      <meta property="og:locale" content="en_IN" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      
      {/* Additional Meta */}
      <meta name="geo.region" content="IN" />
      <meta name="geo.placename" content="India" />
      <meta name="language" content="English" />
      
      {/* JSON-LD Structured Data */}
      {structuredData && Array.isArray(structuredData) ? (
        structuredData.filter(Boolean).map((data, index) => (
          <script key={index} type="application/ld+json">
            {JSON.stringify(data)}
          </script>
        ))
      ) : structuredData ? (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      ) : null}
    </Helmet>
  );
};

/**
 * Generate Project Structured Data (RealEstateListing)
 */
export const generateProjectStructuredData = (project, tenant, properties = [], priceRange = {}) => {
  const baseUrl = BASE_URL;
  
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": project.name,
    "description": project.description,
    "url": `${baseUrl}/p/${project.id}`,
    "datePosted": project.created_at,
    "dateModified": project.updated_at,
    
    // Location
    "address": {
      "@type": "PostalAddress",
      "streetAddress": project.address || project.location,
      "addressLocality": project.city,
      "addressRegion": project.state,
      "postalCode": project.pincode,
      "addressCountry": "IN"
    },
    
    // Geo coordinates if available
    ...(project.latitude && project.longitude && {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": project.latitude,
        "longitude": project.longitude
      }
    }),
    
    // Price range
    "offers": {
      "@type": "AggregateOffer",
      "lowPrice": priceRange.min || 0,
      "highPrice": priceRange.max || 0,
      "priceCurrency": "INR",
      "offerCount": properties.length
    },
    
    // Developer/Agent
    "seller": {
      "@type": "RealEstateAgent",
      "name": tenant.company_name,
      "telephone": tenant.phone,
      "email": tenant.email,
      "url": `${baseUrl}/t/${tenant.id}`
    },
    
    // Additional properties
    "numberOfRooms": project.total_units,
    "floorSize": {
      "@type": "QuantitativeValue",
      "value": properties.reduce((sum, p) => sum + (p.area || 0), 0) / (properties.length || 1),
      "unitCode": "FTK" // Square feet
    },
    
    // Amenities
    ...(project.amenities && {
      "amenityFeature": project.amenities.map(amenity => ({
        "@type": "LocationFeatureSpecification",
        "name": amenity,
        "value": true
      }))
    }),
    
    // Images
    ...(project.image_url && {
      "image": [project.image_url, project.banner_url].filter(Boolean)
    }),
    
    // RERA compliance for Indian real estate
    ...(project.rera_number && {
      "identifier": {
        "@type": "PropertyValue",
        "propertyID": "RERA",
        "value": project.rera_number
      }
    })
  };
};

/**
 * Generate Property Structured Data (SingleFamilyResidence or Apartment)
 */
export const generatePropertyStructuredData = (property, project, tenant) => {
  const baseUrl = BASE_URL;
  const propertyType = property.bedrooms ? "Apartment" : "SingleFamilyResidence";
  
  return {
    "@context": "https://schema.org",
    "@type": propertyType,
    "name": property.name || property.property_number || `Unit at ${project.name}`,
    "description": property.description || `${property.area} ${property.area_unit || 'sq.ft'} property at ${project.name}`,
    "url": `${baseUrl}/p/${project.id}`,
    
    // Location
    "address": {
      "@type": "PostalAddress",
      "streetAddress": project.address || project.location,
      "addressLocality": project.city,
      "addressRegion": project.state,
      "postalCode": project.pincode,
      "addressCountry": "IN"
    },
    
    // Price
    ...(property.price && {
      "offers": {
        "@type": "Offer",
        "price": property.price,
        "priceCurrency": "INR",
        "availability": property.status === 'available' 
          ? "https://schema.org/InStock" 
          : "https://schema.org/SoldOut"
      }
    }),
    
    // Size
    "floorSize": {
      "@type": "QuantitativeValue",
      "value": property.area,
      "unitCode": "FTK"
    },
    
    // Rooms
    ...(property.bedrooms && {
      "numberOfRooms": property.bedrooms,
      "numberOfBedrooms": property.bedrooms,
      "numberOfBathroomsTotal": property.bathrooms || property.bedrooms
    }),
    
    // Floor
    ...(property.floor && {
      "floorLevel": property.floor
    }),
    
    // Image
    ...(property.image_url && {
      "image": property.image_url
    })
  };
};

/**
 * Generate Tenant/Organization Structured Data
 */
export const generateOrganizationStructuredData = (tenant) => {
  const baseUrl = BASE_URL;
  
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": tenant.company_name,
    "description": tenant.description || `${tenant.company_name} - Real Estate Developer in ${tenant.city}, ${tenant.state}`,
    "url": `${baseUrl}/t/${tenant.id}`,
    "telephone": tenant.phone,
    "email": tenant.email,
    
    // Address
    "address": {
      "@type": "PostalAddress",
      "streetAddress": tenant.address,
      "addressLocality": tenant.city,
      "addressRegion": tenant.state,
      "addressCountry": "IN"
    },
    
    // Logo
    ...(tenant.logo_url && {
      "logo": tenant.logo_url,
      "image": tenant.logo_url
    }),
    
    // Social profiles
    ...(tenant.website && {
      "sameAs": [tenant.website]
    }),
    
    // Area served
    "areaServed": {
      "@type": "Country",
      "name": "India"
    }
  };
};

/**
 * Generate Breadcrumb Structured Data
 */
export const generateBreadcrumbStructuredData = (items) => {
  const baseUrl = BASE_URL;
  
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`
    }))
  };
};

/**
 * Generate FAQ Structured Data (for landing pages)
 */
export const generateFAQStructuredData = (faqs) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
};

export default SEOHead;
