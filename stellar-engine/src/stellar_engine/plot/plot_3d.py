from mechaphlowers import PlotEngine


def get_curves(plot_engine: PlotEngine):
    curves = plot_engine.position_engine.get_spans_points()
    return curves
