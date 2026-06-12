#!/usr/bin/env python3
"""Biomed Collections Atlas demo — same on-the-fly map engine as the real
estate atlas (reintel), pointed at blood collections data.

Usage:
  python3 scripts/biomed_atlas_demo.py --region "North Carolina Region"
  python3 scripts/biomed_atlas_demo.py --division "Southeast and Caribbean Division"
  python3 scripts/biomed_atlas_demo.py --state NC

Page 1: counties shaded by FY2025 RBC units collected, drive sponsors as dots.
Output: out/atlas/biomed-<slug>.pdf
"""

import argparse
import re
import sys
from pathlib import Path

import geopandas as gpd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.colors import LinearSegmentedColormap, Normalize
from matplotlib.cm import ScalarMappable
from matplotlib.lines import Line2D
import pandas as pd

COUNTIES = Path("/Users/jefffranzen/dev/reintel-strategy-realestate/data/raw/geojson-tool-arc-counties.geojson")
SPONSORS = Path("/Users/jefffranzen/Desktop/RED CROSS/Biomed/HSSponsorFileMay2026Update.xlsx")
OUT_DIR = Path(__file__).resolve().parent.parent / "out" / "atlas"

CREAM = "#FBF8F1"
INK = "#1C1B19"
MUTED = "#6B6459"
HAIR = "#D8D1C7"
ARC_RED = "#ED1B2E"
SERIF = ["Baskerville", "Georgia", "serif"]
SANS = ["Avenir Next", "Avenir", "Helvetica Neue", "sans-serif"]
MONO = ["Menlo", "Courier New", "monospace"]

REDS = LinearSegmentedColormap.from_list("arc_reds", ["#FBEFEA", "#F2B8AE", "#E66A5E", ARC_RED, "#8F0F1C"])


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def editorial_frame(fig, kicker, title, subtitle):
    fig.patch.set_facecolor(CREAM)
    fig.text(0.045, 0.955, kicker, fontsize=10.5, family=MONO, color=ARC_RED, weight="bold", va="top")
    fig.text(0.045, 0.915, title, fontsize=27, family=SERIF, color=INK, va="top")
    fig.text(0.045, 0.856, subtitle, fontsize=11, family=SANS, color=MUTED, va="top")
    fig.add_artist(plt.Line2D([0.045, 0.955], [0.932, 0.932], transform=fig.transFigure, color=ARC_RED, linewidth=2.2))
    fig.add_artist(plt.Line2D([0.045, 0.955], [0.052, 0.052], transform=fig.transFigure, color=HAIR, linewidth=0.8))
    fig.text(0.045, 0.034, "AMERICAN RED CROSS  ·  BIOMEDICAL SERVICES  ·  biomed.jbf.com",
             fontsize=7.5, family=MONO, color=MUTED, va="center")
    fig.text(0.955, 0.034, "SOURCE: HS SPONSOR FILE, MAY 2026 UPDATE",
             fontsize=7.5, family=MONO, color=MUTED, va="center", ha="right")


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--division")
    g.add_argument("--region")
    g.add_argument("--state")
    ap.add_argument("--year", type=int, default=2025)
    args = ap.parse_args()
    kind, value = next((k, v) for k, v in vars(args).items() if v and k != "year")
    year = args.year

    counties = gpd.read_file(COUNTIES)
    cfield = {"division": "Division", "region": "Region", "state": "STUSPS"}[kind]
    if kind == "state":
        value = value.upper()
    geo = counties[counties[cfield].str.lower() == value.lower()].copy()
    if geo.empty:
        sys.exit(f"No geography match for {kind} = {value!r}")
    if kind == "state":
        value = geo["STATE_NAME"].iloc[0]

    df = pd.read_excel(SPONSORS)
    df = df[(df["Year"] == year) & df["Lat"].notna() & df["Long"].notna()]
    pts = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df["Long"], df["Lat"]), crs=4326)
    # spatial join: drives -> selected counties
    pts = gpd.sjoin(pts, geo[["FIPS", "County_Long", "geometry"]], predicate="within")
    by_cty = pts.groupby("FIPS").agg(units=("RBC Products Collected", "sum"),
                                     drives=("Drives", "sum"),
                                     sponsors=("Sponsor Ext ID", "nunique"))
    geo = geo.merge(by_cty, on="FIPS", how="left")
    units, drives, sponsors = pts["RBC Products Collected"].sum(), pts["Drives"].sum(), pts["Sponsor Ext ID"].nunique()
    print(f"{value}: {sponsors:,} sponsors, {drives:,.0f} drives, {units:,.0f} units in FY{year}")

    fig = plt.figure(figsize=(17, 11))
    editorial_frame(
        fig,
        "AMERICAN RED CROSS · BIOMEDICAL SERVICES · COLLECTIONS ATLAS",
        f"{value} — FY{year} Blood Collections",
        f"{sponsors:,} sponsors  ·  {drives:,.0f} drives  ·  {units:,.0f} RBC units collected"
        "  ·  counties shaded by units, dots are drive sponsors",
    )
    ax = fig.add_axes([0.03, 0.07, 0.70, 0.76])
    ax.set_facecolor(CREAM)
    ax.set_axis_off()

    crs = geo.estimate_utm_crs()
    geo_p = geo.to_crs(crs)
    pts_p = pts.to_crs(crs)

    vmax = geo_p["units"].quantile(0.97)
    norm = Normalize(vmin=0, vmax=max(vmax, 1))
    geo_p.plot(ax=ax, column="units", cmap=REDS, norm=norm,
               edgecolor="white", linewidth=0.45,
               missing_kwds={"color": "#EFEAE0"})
    if kind != "state":
        geo_p.dissolve(by="Chapter").boundary.plot(ax=ax, color="#7A7468", linewidth=0.9)
    geo_p.dissolve().boundary.plot(ax=ax, color=INK, linewidth=2.0)
    ax.scatter(pts_p.geometry.x, pts_p.geometry.y,
               s=4 + pts_p["Drives"].clip(0, 60) * 0.8,
               color="#1F3A5F", alpha=0.35, edgecolor="none", zorder=5)
    ax.margins(0.04)
    ax.set_aspect("equal")

    rx = 0.755
    fig.text(rx, 0.80, f"RBC UNITS COLLECTED, FY{year}", fontsize=9.5,
             family=MONO, color=ARC_RED, weight="bold")
    cax = fig.add_axes([rx, 0.745, 0.17, 0.018])
    cb = fig.colorbar(ScalarMappable(norm=norm, cmap=REDS), cax=cax, orientation="horizontal")
    cb.outline.set_edgecolor(HAIR)
    cax.tick_params(labelsize=8, colors=MUTED)
    leg_ax = fig.add_axes([rx, 0.55, 0.21, 0.15])
    leg_ax.set_axis_off()
    handles = [
        Line2D([], [], marker="o", linestyle="", markersize=4, alpha=0.5,
               markerfacecolor="#1F3A5F", markeredgecolor="none", label="Sponsor · few drives"),
        Line2D([], [], marker="o", linestyle="", markersize=11, alpha=0.5,
               markerfacecolor="#1F3A5F", markeredgecolor="none", label="Sponsor · 60+ drives"),
    ]
    leg_ax.legend(handles=handles, loc="upper left", frameon=False,
                  prop={"family": SANS[0], "size": 10.5}, labelspacing=1.0)

    # top counties table
    top = geo_p.nlargest(10, "units")
    fig.text(rx, 0.50, "TOP COUNTIES BY UNITS", fontsize=9.5, family=MONO,
             color=ARC_RED, weight="bold")
    y = 0.470
    for _, r in top.iterrows():
        name = f"{r['County_Long']}, {r['STUSPS']}"
        fig.text(rx, y, name if len(name) < 30 else name[:28] + "…",
                 fontsize=9, family=SANS, color=INK, va="center")
        fig.text(rx + 0.20, y, f"{r['units']:,.0f}", fontsize=9, family=SANS,
                 color=INK, va="center", ha="right")
        y -= 0.027

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"biomed-{slugify(value)}-fy{year}.pdf"
    with PdfPages(out) as pdf:
        pdf.savefig(fig, facecolor=CREAM)
    plt.close(fig)
    print(out)


if __name__ == "__main__":
    main()
