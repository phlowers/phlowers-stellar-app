from stellar_engine.core import manipulations
from mechaphlowers import BalanceEngine, SectionStudy




def test_lengthen_cable(balance_engine_base: BalanceEngine):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )
    inputs = {
    'spanIndex': 0,
    'widthCable': 'lengthening',
    'sizeCable': 10,
    'distanceSupportRef': 0,
    'supportRef': 'LEFT',
    }
    study.solve_adjustment()
    manipulations.modify_cable(inputs, study)
    
    assert True