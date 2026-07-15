from mechaphlowers import BalanceEngine, SectionStudy

from stellar_engine.core import manipulations


def test_lengthen_cable(balance_engine_base: BalanceEngine):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )
    inputs = {
        'spanIndex': 0,
        'modificationType': 'lengthening',
        'modifiedLengthCable': 10,
        'distanceSupportRef': 0,
        'supportRef': 'LEFT',
    }
    study.solve_adjustment()
    study.solve_change_state()
    # plot_2d.refresh_projection(study)
    spans_coords_0 = study.position_engine.get_group_points().spans.coords
    extract_span_coords_0 = spans_coords_0[0][0:6]
    manipulations.modify_cable(inputs, study)

    spans_coords_1 = study.position_engine.get_group_points().spans.coords
    extract_span_coords_1 = spans_coords_1[0][0:6]

    print(extract_span_coords_0)
    print(extract_span_coords_1)
