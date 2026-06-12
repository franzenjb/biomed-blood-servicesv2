#!/usr/bin/env python3
"""Biomed Mapping App Suite — five on-the-fly map concepts from the HS Sponsor File.

Usage:
  python3 scripts/biomed_atlas_suite.py --region "North Carolina Region"
  python3 scripts/biomed_atlas_suite.py --region "..." --apps growth,yield

Apps: collections · growth · mix · yield · opportunity
Output: out/atlas/biomed-<app>-<slug>.pdf
"""

import argparse
import re
from pathlib import Path

import geopandas as gpd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.colors import LinearSegmentedColormap, Normalize, TwoSlopeNorm
from matplotlib.cm import ScalarMappable
from matplotlib.colors import to_rgba
from matplotlib.lines import Line2D
import numpy as np
import pandas as pd

COUNTIES = Path("/Users/jefffranzen/dev/reintel-strategy-realestate/data/raw/geojson-tool-arc-counties.geojson")
SPONSORS = Path("/Users/jefffranzen/Desktop/RED CROSS/Biomed/HSSponsorFileMay2026Update.xlsx")
CACHE = Path("/tmp/hssponsor_cache.pkl")
OUT_DIR = Path(__file__).resolve().parent.parent / "out" / "atlas"

CREAM = "#FBF8F1"
INK = "#1C1B19"
MUTED = "#6B6459"
HAIR = "#D8D1C7"
ARC_RED = "#ED1B2E"
NAVY = "#1F3A5F"
SERIF = ["Baskerville", "Georgia", "serif"]
SANS = ["Avenir Next", "Avenir", "Helvetica Neue", "sans-serif"]
MONO = ["Menlo", "Courier New", "monospace"]
KICKER = "AMERICAN RED CROSS · BIOMEDICAL SERVICES"
GRAY_RGBA = (0.937, 0.918, 0.878, 1.0)  # #EFEAE0

REDS = LinearSegmentedColormap.from_list(
    "arc_reds", ["#FBEFEA", "#F2B8AE", "#E66A5E", ARC_RED, "#8F0F1C"])
NAVIES = LinearSegmentedColormap.from_list(
    "arc_navies", ["#EFF2F6", "#A9BBD0", "#5C7BA0", NAVY])
DIVERGE = LinearSegmentedColormap.from_list(
    "arc_diverge", [NAVY, "#7E94AC", "#F2EEE5", "#E66A5E", ARC_RED])

ACCOUNT_COLORS = {
    "Education": ARC_RED,
    "Business": NAVY,
    "Religious": "#C9A227",
    "Civic / Community": "#7B4FA6",
    "Health": "#3F7A5E",
    "Government": "#5A5347",
}
ACCOUNT_OTHER = "#9C968A"


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def fmt_num(v):
    return "—" if v is None or pd.isna(v) else f"{v:,.0f}"


def editorial_frame(fig, title, subtitle):
    fig.patch.set_facecolor(CREAM)
    fig.text(0.045, 0.955, KICKER, fontsize=10.5, family=MONO,
             color=ARC_RED, weight="bold", va="top")
    fig.text(0.045, 0.915, title, fontsize=27, family=SERIF, color=INK, va="top")
    fig.text(0.045, 0.856, subtitle, fontsize=11, family=SANS, color=MUTED, va="top")
    fig.add_artist(plt.Line2D([0.045, 0.955], [0.932, 0.932],
                              transform=fig.transFigure, color=ARC_RED, linewidth=2.2))
    fig.add_artist(plt.Line2D([0.045, 0.955], [0.052, 0.052],
                              transform=fig.transFigure, color=HAIR, linewidth=0.8))
    fig.text(0.045, 0.034, "AMERICAN RED CROSS  ·  BIOMEDICAL SERVICES  ·  biomed.jbf.com",
             fontsize=7.5, family=MONO, color=MUTED, va="center")
    fig.text(0.955, 0.034, "SOURCE: HS SPONSOR FILE, MAY 2026 UPDATE",
             fontsize=7.5, family=MONO, color=MUTED, va="center", ha="right")


def map_axes(fig):
    ax = fig.add_axes([0.03, 0.07, 0.70, 0.76])
    ax.set_facecolor(CREAM)
    ax.set_axis_off()
    return ax


def rail_kicker(fig, y, text):
    fig.text(0.755, y, text, fontsize=9.5, family=MONO, color=ARC_RED, weight="bold")


def rail_colorbar(fig, y, cmap, norm, tick_fmt="{x:,.0f}"):
    cax = fig.add_axes([0.755, y, 0.17, 0.018])
    cb = fig.colorbar(ScalarMappable(norm=norm, cmap=cmap), cax=cax,
                      orientation="horizontal")
    cb.outline.set_edgecolor(HAIR)
    cax.tick_params(labelsize=8, colors=MUTED)
    return cb


def rail_list(fig, y, rows, value_fmt=fmt_num):
    for name, v in rows:
        fig.text(0.755, y, name if len(name) < 30 else name[:28] + "…",
                 fontsize=9, family=SANS, color=INK, va="center")
        fig.text(0.955, y, value_fmt(v), fontsize=9, family=SANS,
                 color=INK, va="center", ha="right")
        y -= 0.026
    return y


def base_map(ax, geo_p, county_colors):
    geo_p.plot(ax=ax, color=county_colors, edgecolor="white", linewidth=0.45)
    geo_p.dissolve(by="Chapter").boundary.plot(ax=ax, color="#7A7468", linewidth=0.9)
    geo_p.dissolve().boundary.plot(ax=ax, color=INK, linewidth=2.0)
    ax.margins(0.04)
    ax.set_aspect("equal")


# ---- shared data ---------------------------------------------------------------

def load(region):
    counties = gpd.read_file(COUNTIES)
    geo = counties[counties["Region"].str.lower() == region.lower()].copy()
    if geo.empty:
        geo = counties[counties["Region"].str.lower().str.contains(region.lower(), na=False)].copy()
    if geo.empty:
        raise SystemExit(f"No region match for {region!r}")
    region = geo["Region"].iloc[0]
    geo["Pop_2023"] = pd.to_numeric(
        geo["Pop_2023"].astype(str).str.replace(",", ""), errors="coerce")

    if CACHE.exists():
        df = pd.read_pickle(CACHE)
    else:
        df = pd.read_excel(SPONSORS)
        df.to_pickle(CACHE)
    for col in ("Year", "Drives", "RBC Products Collected", "Lat", "Long"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df[df["Lat"].notna() & df["Long"].notna()]
    pts = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df["Long"], df["Lat"]),
                           crs=4326)
    pts = gpd.sjoin(
        pts,
        geo[["FIPS", "County_Long", "STUSPS", "Chapter", "Pop_2023", "geometry"]],
        predicate="within")
    crs = geo.estimate_utm_crs()
    return region, geo.to_crs(crs), pts.to_crs(crs)


def county_year(pts):
    g = pts.groupby(["FIPS", "Year"]).agg(
        units=("RBC Products Collected", "sum"),
        drives=("Drives", "sum"),
        sponsors=("Sponsor Ext ID", "nunique")).reset_index()
    return g


def cname(geo_p):
    return (geo_p["County_Long"].str.replace(
        r" (County|Parish|Borough|Municipality|Municipio|Census Area)$", "",
        regex=True) + ", " + geo_p["STUSPS"])


# ---- app 1: collections ---------------------------------------------------------

def app_collections(region, geo_p, pts, out):
    yr = 2025
    p = pts[pts["Year"] == yr]
    agg = p.groupby("FIPS").agg(units=("RBC Products Collected", "sum")).reset_index()
    g = geo_p.merge(agg, on="FIPS", how="left")
    fig = plt.figure(figsize=(17, 11))
    editorial_frame(
        fig, f"{region} — FY{yr} Blood Collections",
        f"{p['Sponsor Ext ID'].nunique():,} Sponsors  ·  {p['Drives'].sum():,.0f} Drives"
        f"  ·  {p['RBC Products Collected'].sum():,.0f} RBC Units Collected"
        "  ·  Counties Shaded by Units, Dots Are Drive Sponsors")
    ax = map_axes(fig)
    norm = Normalize(0, max(g["units"].quantile(0.97), 1))
    base_map(ax, g, [REDS(norm(v)) if pd.notna(v) else GRAY_RGBA for v in g["units"]])
    ax.scatter(p.geometry.x, p.geometry.y, s=4 + p["Drives"].clip(0, 60) * 0.8,
               color=NAVY, alpha=0.35, edgecolor="none", zorder=5)
    rail_kicker(fig, 0.80, f"RBC UNITS COLLECTED, FY{yr}")
    rail_colorbar(fig, 0.745, REDS, norm)
    rail_kicker(fig, 0.66, "TOP COUNTIES BY UNITS")
    top = g.assign(_n=cname(g)).nlargest(10, "units")
    rail_list(fig, 0.63, list(zip(top["_n"], top["units"])))
    with PdfPages(out) as pdf:
        pdf.savefig(fig, facecolor=CREAM)
    plt.close(fig)


# ---- app 2: growth ---------------------------------------------------------------

def app_growth(region, geo_p, pts, out):
    cy = county_year(pts)
    piv = cy.pivot(index="FIPS", columns="Year", values="units").fillna(0)
    piv["delta"] = piv.get(2025, 0) - piv.get(2022, 0)
    piv["pct"] = np.where(piv.get(2022, 0) > 100,
                          piv["delta"] / piv[2022] * 100, np.nan)
    g = geo_p.merge(piv[["delta", "pct"]], on="FIPS", how="left")
    t22, t25 = pts[pts.Year == 2022]["RBC Products Collected"].sum(), \
        pts[pts.Year == 2025]["RBC Products Collected"].sum()
    fig = plt.figure(figsize=(17, 11))
    editorial_frame(
        fig, f"{region} — Collections Growth, FY22 → FY25",
        f"Region Total {t22:,.0f} → {t25:,.0f} Units ({(t25-t22)/t22*100:+.1f}%)"
        "  ·  Counties Shaded by Percent Change  ·  Gray = Under 100 Units in FY22")
    ax = map_axes(fig)
    lim = np.nanmax(np.abs(g["pct"].clip(-80, 80))) or 1
    norm = TwoSlopeNorm(vmin=-lim, vcenter=0, vmax=lim)
    base_map(ax, g, [DIVERGE(norm(v)) if pd.notna(v) else GRAY_RGBA
                     for v in g["pct"].clip(-80, 80)])
    rail_kicker(fig, 0.80, "UNITS CHANGE FY22 → FY25 (%)")
    rail_colorbar(fig, 0.745, DIVERGE, norm)
    gg = g.assign(_n=cname(g)).dropna(subset=["pct"])
    rail_kicker(fig, 0.66, "FASTEST GROWING")
    y = rail_list(fig, 0.63, list(zip(gg.nlargest(6, "pct")["_n"],
                                      gg.nlargest(6, "pct")["pct"])),
                  value_fmt=lambda v: f"{v:+.0f}%")
    rail_kicker(fig, y - 0.02, "STEEPEST DECLINES")
    rail_list(fig, y - 0.05, list(zip(gg.nsmallest(6, "pct")["_n"],
                                      gg.nsmallest(6, "pct")["pct"])),
              value_fmt=lambda v: f"{v:+.0f}%")
    with PdfPages(out) as pdf:
        pdf.savefig(fig, facecolor=CREAM)
    plt.close(fig)


# ---- app 3: sponsor mix -----------------------------------------------------------

def app_mix(region, geo_p, pts, out):
    yr = 2025
    p = pts[pts["Year"] == yr].copy()
    p["_grp"] = [t if t in ACCOUNT_COLORS else "Other" for t in p["Account Type"]]
    fig = plt.figure(figsize=(17, 11))
    drives_by = p.groupby("_grp")["Drives"].sum().sort_values(ascending=False)
    lead = drives_by.index[0]
    editorial_frame(
        fig, f"{region} — Sponsor Mix, FY{yr}",
        f"Who Hosts the Drives: {lead} Sponsors Lead With {drives_by.iloc[0]:,.0f} Drives"
        "  ·  Dots Colored by Sponsor Account Type, Sized by Drives")
    ax = map_axes(fig)
    base_map(ax, geo_p, ["#F1EDE3"] * len(geo_p))
    for grp, sel in p.groupby("_grp"):
        ax.scatter(sel.geometry.x, sel.geometry.y,
                   s=5 + sel["Drives"].clip(0, 60) * 1.0,
                   color=ACCOUNT_COLORS.get(grp, ACCOUNT_OTHER),
                   alpha=0.55, edgecolor="none", zorder=5)
    rail_kicker(fig, 0.80, "DRIVES BY SPONSOR TYPE")
    handles = [Line2D([], [], marker="o", linestyle="", markersize=9,
                      markerfacecolor=ACCOUNT_COLORS.get(grp, ACCOUNT_OTHER),
                      markeredgecolor="white",
                      label=f"{grp} ({v:,.0f})")
               for grp, v in drives_by.items()]
    lax = fig.add_axes([0.755, 0.55, 0.21, 0.22])
    lax.set_axis_off()
    lax.legend(handles=handles, loc="upper left", frameon=False,
               labelspacing=0.7, prop={"family": SANS[0], "size": 10})
    # donut: units share by sponsor type
    rail_kicker(fig, 0.46, "RBC UNITS SHARE BY TYPE")
    dax = fig.add_axes([0.765, 0.13, 0.17, 0.28])
    dax.set_facecolor(CREAM)
    units_by = p.groupby("_grp")["RBC Products Collected"].sum()
    units_by = units_by[units_by > 0].sort_values(ascending=False)
    dax.pie(units_by.values,
            labels=[f"{k}\n{v/units_by.sum():.0%}" for k, v in units_by.items()],
            colors=[ACCOUNT_COLORS.get(k, ACCOUNT_OTHER) for k in units_by.index],
            startangle=90, counterclock=False,
            wedgeprops=dict(width=0.40, edgecolor="white", linewidth=1.5),
            textprops=dict(fontsize=8.2, family=SANS[0], color=INK),
            labeldistance=1.15)
    dax.text(0, 0, fmt_num(units_by.sum()), ha="center", va="center",
             fontsize=10.5, family=SERIF, color=INK)
    with PdfPages(out) as pdf:
        pdf.savefig(fig, facecolor=CREAM)
    plt.close(fig)


# ---- app 4: yield ------------------------------------------------------------------

def app_yield(region, geo_p, pts, out):
    yr = 2025
    p = pts[pts["Year"] == yr]
    agg = p.groupby("FIPS").agg(units=("RBC Products Collected", "sum"),
                                drives=("Drives", "sum")).reset_index()
    agg["yield"] = np.where(agg["drives"] >= 25, agg["units"] / agg["drives"], np.nan)
    g = geo_p.merge(agg, on="FIPS", how="left")
    overall = p["RBC Products Collected"].sum() / max(p["Drives"].sum(), 1)
    fig = plt.figure(figsize=(17, 11))
    editorial_frame(
        fig, f"{region} — Drive Yield, FY{yr}",
        f"Region Average {overall:.1f} RBC Units Per Drive"
        "  ·  Counties Shaded by Units Per Drive  ·  Gray = Under 25 Drives")
    ax = map_axes(fig)
    vals = g["yield"]
    norm = Normalize(np.nanquantile(vals, 0.03), np.nanquantile(vals, 0.97))
    base_map(ax, g, [NAVIES(norm(v)) if pd.notna(v) else GRAY_RGBA for v in vals])
    rail_kicker(fig, 0.80, f"RBC UNITS PER DRIVE, FY{yr}")
    rail_colorbar(fig, 0.745, NAVIES, norm)
    gg = g.assign(_n=cname(g)).dropna(subset=["yield"])
    rail_kicker(fig, 0.66, "HIGHEST YIELD (25+ DRIVES)")
    y = rail_list(fig, 0.63, list(zip(gg.nlargest(8, "yield")["_n"],
                                      gg.nlargest(8, "yield")["yield"])),
                  value_fmt=lambda v: f"{v:.1f}")
    rail_kicker(fig, y - 0.02, "LOWEST YIELD")
    rail_list(fig, y - 0.05, list(zip(gg.nsmallest(8, "yield")["_n"],
                                      gg.nsmallest(8, "yield")["yield"])),
              value_fmt=lambda v: f"{v:.1f}")
    with PdfPages(out) as pdf:
        pdf.savefig(fig, facecolor=CREAM)
    plt.close(fig)


# ---- app 5: opportunity -------------------------------------------------------------

def app_opportunity(region, geo_p, pts, out):
    yr = 2025
    p = pts[pts["Year"] == yr]
    agg = p.groupby("FIPS").agg(units=("RBC Products Collected", "sum")).reset_index()
    g = geo_p.merge(agg, on="FIPS", how="left")
    g["units"] = g["units"].fillna(0)
    g["per_k"] = np.where(g["Pop_2023"] > 0, g["units"] / g["Pop_2023"] * 1000, np.nan)
    # opportunity: deep red where coverage is LOW
    fig = plt.figure(figsize=(17, 11))
    region_rate = g["units"].sum() / g["Pop_2023"].sum() * 1000
    editorial_frame(
        fig, f"{region} — Collection Opportunity, FY{yr}",
        f"Region Average {region_rate:.1f} Units Per 1,000 Residents"
        "  ·  Deeper Red = More Untapped Potential (Low Units Per Capita)")
    ax = map_axes(fig)
    cap = np.nanquantile(g["per_k"], 0.9) or 1
    inv = 1 - (g["per_k"].clip(0, cap) / cap)
    norm = Normalize(0, 1)
    base_map(ax, g, [REDS(norm(v) * 0.85) if pd.notna(v) else GRAY_RGBA for v in inv])
    # outline the big-population, low-coverage targets
    targets = g[(g["Pop_2023"] > 75000) & (g["per_k"] < region_rate * 0.4)]
    if len(targets):
        targets.boundary.plot(ax=ax, color=INK, linewidth=1.6, zorder=6)
    rail_kicker(fig, 0.80, "UNITS PER 1,000 RESIDENTS")
    cb_norm = Normalize(0, cap)
    rail_colorbar(fig, 0.745, REDS.reversed(), cb_norm)
    fig.text(0.755, 0.715, "Scale Reversed — Deep Red = Low Coverage",
             fontsize=8.2, family=SANS, color=MUTED)
    tt = targets.assign(_n=cname(targets)).sort_values("Pop_2023", ascending=False)
    rail_kicker(fig, 0.64, "TOP TARGETS — BIG POPULATION, LOW COVERAGE")
    y = 0.61
    for _, r in tt.head(10).iterrows():
        fig.text(0.755, y, r["_n"], fontsize=9, family=SANS, color=INK, va="center")
        fig.text(0.955, y, f"{r['Pop_2023']:,.0f} Pop · {r['per_k']:.1f}/k",
                 fontsize=8.4, family=SANS, color=MUTED, va="center", ha="right")
        y -= 0.026
    with PdfPages(out) as pdf:
        pdf.savefig(fig, facecolor=CREAM)
    plt.close(fig)


APPS = {
    "collections": app_collections,
    "growth": app_growth,
    "mix": app_mix,
    "yield": app_yield,
    "opportunity": app_opportunity,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--region", required=True)
    ap.add_argument("--apps", default="all")
    args = ap.parse_args()
    names = list(APPS) if args.apps == "all" else args.apps.split(",")

    region, geo_p, pts = load(args.region)
    print(f"{region}: {len(geo_p)} counties, {len(pts):,} sponsor-year rows")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name in names:
        out = OUT_DIR / f"biomed-{name}-{slugify(region)}.pdf"
        APPS[name](region, geo_p, pts, out)
        print(out)


if __name__ == "__main__":
    main()
